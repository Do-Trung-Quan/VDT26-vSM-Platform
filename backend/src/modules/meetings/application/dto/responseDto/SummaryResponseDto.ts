import { MeetingSummaryStatus } from '../../../domain/entities/meeting-summary.entity';

export type SummaryStatus = MeetingSummaryStatus | 'NOT_STARTED';

export class SummaryResponseDto {
  status: SummaryStatus;
  summaryText: string | null;
}
