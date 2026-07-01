import { DomainEventBase } from '../../../../common/domain/domain-event.base';
import { MeetingStatus } from '../entities/meeting.entity';

export class MeetingStatusChangedEvent extends DomainEventBase {
  readonly eventName = 'MeetingStatusChangedEvent';

  constructor(
    public readonly meetingId: string,
    public readonly title: string,
    public readonly departmentId: string,
    public readonly newStatus: MeetingStatus,
  ) {
    super({ meetingId, title, departmentId, newStatus });
  }
}
