import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Meeting, MeetingStatus, MeetingType } from '../../domain/entities/meeting.entity';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { OBJECT_STORAGE_PORT } from '../../../../shared/object-storage/object-storage.tokens';
import { IObjectStoragePort } from '../../../../shared/object-storage/ports/object-storage.port';
import { CurrentUserPayload } from '../../../../common/decorators/current-user.decorator';

const ALLOWED_EXTS = ['.mp3', '.wav'];
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

export class InitUploadAudioRequestDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  /** Tên file gốc — dùng để xác định extension và key trên MinIO */
  @IsString()
  @MinLength(3)
  filename: string;

  /** Dung lượng file (bytes) — backend validate không vượt quá giới hạn */
  @IsOptional()
  filesize?: number;
}

export interface InitUploadAudioResponse {
  meetingId: string;
  presignedUrl: string;
}

@Injectable()
export class InitUploadAudioHandler {
  constructor(
    @Inject(MEETING_REPOSITORY)   private readonly meetingRepo:    IMeetingRepository,
    @Inject(OBJECT_STORAGE_PORT)  private readonly objectStorage:  IObjectStoragePort,
  ) {}

  async execute(dto: InitUploadAudioRequestDto, currentUser: CurrentUserPayload): Promise<InitUploadAudioResponse> {
    const ext = extname(dto.filename).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      throw new BadRequestException('Chỉ chấp nhận file MP3 hoặc WAV');
    }
    if (dto.filesize && dto.filesize > MAX_FILE_SIZE) {
      throw new BadRequestException('File không được vượt quá 200 MB');
    }

    const meeting            = new Meeting();
    meeting.id               = randomUUID();
    meeting.title            = dto.title;
    meeting.description      = dto.description ?? null;
    meeting.type             = MeetingType.UPLOAD;
    meeting.hostId           = currentUser.id;
    meeting.departmentId     =
      currentUser.role === 'ADMIN' && dto.departmentId
        ? dto.departmentId
        : currentUser.departmentId;
    meeting.isLocked         = false;
    meeting.deletedAt        = null;
    meeting.status           = MeetingStatus.PROCESSING;
    if (dto.startedAt) meeting.startedAt = new Date(dto.startedAt);

    const audioKey   = `audio/${meeting.id}${ext}`;
    meeting.audioUrl = audioKey;

    await this.meetingRepo.save(meeting);

    const presignedUrl = await this.objectStorage.getPresignedPutUrl(audioKey, 30 * 60); // 30 phút

    return { meetingId: meeting.id, presignedUrl };
  }
}
