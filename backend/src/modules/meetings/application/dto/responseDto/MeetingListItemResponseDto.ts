import { Meeting, MeetingStatus, MeetingType } from '../../../domain/entities/meeting.entity';

/** Response DTO cho danh sách meeting — không có audioUrl (chỉ detail mới có) */
export class MeetingListItemResponseDto {
  id: string;
  title: string;
  description: string | null;
  type: MeetingType;
  status: MeetingStatus;
  hostId: string;
  hostName: string;
  departmentId: string;
  departmentName: string;
  isLocked: boolean;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;

  static from(m: Meeting): MeetingListItemResponseDto {
    const dto = new MeetingListItemResponseDto();
    dto.id            = m.id;
    dto.title         = m.title;
    dto.description   = m.description;
    dto.type          = m.type;
    dto.status        = m.status;
    dto.hostId        = m.hostId;
    dto.hostName      = m.host?.fullName ?? '';
    dto.departmentId  = m.departmentId;
    dto.departmentName = m.department?.name ?? '';
    dto.isLocked      = m.isLocked;
    dto.startedAt     = m.startedAt?.toISOString() ?? null;
    dto.endedAt       = m.endedAt?.toISOString() ?? null;
    dto.createdAt     = m.createdAt.toISOString();
    return dto;
  }
}

export interface MeetingListResponseDto {
  items: MeetingListItemResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
