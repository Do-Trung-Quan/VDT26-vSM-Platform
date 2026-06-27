import { MeetingStatus, MeetingType } from '../../domain/entities/meeting.entity';

export class MeetingDetailDto {
  id: string;
  title: string;
  description: string | null;
  type: MeetingType;
  status: MeetingStatus;
  hostId: string;
  hostName: string;
  departmentId: string;
  departmentName: string;
  audioUrl: string | null;   // pre-signed URL nếu có file
  durationSeconds: number | null;
  isLocked: boolean;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}
