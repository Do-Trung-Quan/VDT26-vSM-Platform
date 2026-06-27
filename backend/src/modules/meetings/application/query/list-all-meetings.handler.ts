import { Inject, Injectable } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { ListMeetingsQueryDto } from '../dto/list-meetings-query.dto';
import { ListMeetingsResult } from './list-meetings.handler';
import { MeetingDetailDto } from '../dto/meeting-detail.dto';

@Injectable()
export class ListAllMeetingsHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
  ) { }

  async execute(query: ListMeetingsQueryDto): Promise<ListMeetingsResult> {
    const { items, total } = await this.meetingRepo.listAll({
      page: query.page, limit: query.limit,
      departmentId: query.departmentId, status: query.status,
      fromDate: query.fromDate, toDate: query.toDate,
      deletedStatus: query.deletedStatus ?? 'active',
    });

    return {
      items: items.map((m): MeetingDetailDto => ({
        id: m.id, title: m.title, description: m.description,
        type: m.type, status: m.status,
        hostId: m.hostId, hostName: m.host?.fullName ?? '',
        departmentId: m.departmentId, departmentName: m.department?.name ?? '',
        audioUrl: null, durationSeconds: m.durationSeconds, isLocked: m.isLocked,
        startedAt: m.startedAt?.toISOString() ?? null,
        endedAt: m.endedAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
      total, page: query.page, limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
