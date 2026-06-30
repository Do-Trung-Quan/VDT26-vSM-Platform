import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Meeting, MeetingStatus, MeetingType } from '../../domain/entities/meeting.entity';
import { MeetingCreatedEvent } from '../../domain/events/meeting-created.event';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { EVENT_PUBLISHER_PORT } from '../../../../shared/event-bus/event-bus.tokens';
import { IEventPublisherPort } from '../../../../shared/event-bus/ports/event-publisher.port';
import { CurrentUserPayload } from '../../../../common/decorators/current-user.decorator';
import { CreateLiveMeetingRequestDto } from '../dto/requestDto/CreateLiveMeetingRequestDto';
import { MeetingDetailResponseDto } from '../dto/responseDto/MeetingDetailResponseDto';

@Injectable()
export class CreateLiveMeetingHandler {
  private readonly maxConcurrentSessions: number;

  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
    @Inject(EVENT_PUBLISHER_PORT) private readonly eventPublisher: IEventPublisherPort,
    cfg: ConfigService,
  ) {
    this.maxConcurrentSessions = cfg.get<number>('transcription.maxConcurrentSessions') ?? 20;
  }

  async execute(
    dto: CreateLiveMeetingRequestDto,
    currentUser: CurrentUserPayload,
  ): Promise<MeetingDetailResponseDto> {
    // Kiểm tra ngưỡng meeting Live đang hoạt động — fail sớm tại REST để user thấy lỗi
    // ngay trong dialog tạo meeting, trước khi điều hướng vào Live Workspace
    const activeLiveCount = await this.meetingRepo.countActiveByStatus(MeetingStatus.LIVE);
    if (activeLiveCount >= this.maxConcurrentSessions) {
      throw new ConflictException(
        `Hệ thống đang có ${activeLiveCount} cuộc họp trực tuyến — đã đạt giới hạn ${this.maxConcurrentSessions} phiên đồng thời`,
      );
    }

    const meeting = new Meeting();
    meeting.title        = dto.title;
    meeting.description  = dto.description ?? null;
    meeting.type         = MeetingType.LIVE;
    meeting.hostId       = currentUser.id;
    meeting.departmentId =
      currentUser.role === 'ADMIN' && dto.departmentId
        ? dto.departmentId
        : currentUser.departmentId;
    meeting.status          = MeetingStatus.LIVE;
    meeting.audioUrl        = null;
    meeting.durationSeconds = null;
    meeting.isLocked        = false;
    meeting.deletedAt       = null;

    meeting.startLive();

    await this.meetingRepo.save(meeting);

    await this.eventPublisher.publish(
      new MeetingCreatedEvent(meeting.id, meeting.title, meeting.departmentId, meeting.hostId),
    );

    const saved = await this.meetingRepo.findActiveById(meeting.id);
    return MeetingDetailResponseDto.from(saved!);
  }
}
