import { MeetingSummary } from '../entities/meeting-summary.entity';

export interface IMeetingSummaryRepository {
  save(summary: MeetingSummary): Promise<void>;
  findByMeeting(meetingId: string): Promise<MeetingSummary | null>;
}
