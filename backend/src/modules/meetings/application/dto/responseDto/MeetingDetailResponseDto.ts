import { Meeting, MeetingStatus, MeetingType } from '../../../domain/entities/meeting.entity';

/** Response DTO cho chi tiết meeting — có audioUrl pre-signed */
export class MeetingDetailResponseDto {
  id: string;
  title: string;
  description: string | null;
  type: MeetingType;
  status: MeetingStatus;
  hostId: string;
  hostName: string;
  departmentId: string;
  departmentName: string;
  audioUrl: string | null;
  durationSeconds: number | null;
  isLocked: boolean;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;

  static from(m: Meeting, signedAudioUrl: string | null = null): MeetingDetailResponseDto {
    const dto = new MeetingDetailResponseDto();
    dto.id             = m.id;
    dto.title          = m.title;
    dto.description    = m.description;
    dto.type           = m.type;
    dto.status         = m.status;
    dto.hostId         = m.hostId;
    dto.hostName       = m.host?.fullName ?? '';
    dto.departmentId   = m.departmentId;
    dto.departmentName = m.department?.name ?? '';
    dto.audioUrl       = signedAudioUrl;
    dto.durationSeconds = m.durationSeconds;
    dto.isLocked       = m.isLocked;
    dto.startedAt      = m.startedAt?.toISOString() ?? null;
    dto.endedAt        = m.endedAt?.toISOString() ?? null;
    dto.createdAt      = m.createdAt.toISOString();
    return dto;
  }
}
