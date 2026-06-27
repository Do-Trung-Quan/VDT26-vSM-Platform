import { DomainEventBase } from '../../../../common/domain/domain-event.base';

export class MeetingCreatedEvent extends DomainEventBase {
  readonly eventName = 'meeting.created';

  constructor(
    public readonly meetingId: string,
    public readonly title: string,
    public readonly departmentId: string,
    public readonly hostId: string,
  ) {
    super({ meetingId, title, departmentId, hostId });
  }
}
