import { Meeting } from '../../../domain/entities/meeting.entity';

export class MeetingUpdateResponseDto {
  id: string;
  title: string;
  description: string | null;
  departmentId: string;
  departmentName: string;
  isLocked: boolean;
  updatedAt: string;

  static from(m: Meeting): MeetingUpdateResponseDto {
    const dto = new MeetingUpdateResponseDto();
    dto.id             = m.id;
    dto.title          = m.title;
    dto.description    = m.description;
    dto.departmentId   = m.departmentId;
    dto.departmentName = m.department?.name ?? '';
    dto.isLocked       = m.isLocked;
    dto.updatedAt      = m.updatedAt.toISOString();
    return dto;
  }
}
