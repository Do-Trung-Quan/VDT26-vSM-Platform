import { DomainEventBase } from '../../../../common/domain/domain-event.base';

export class MeetingInfoUpdatedEvent extends DomainEventBase {
  readonly eventName = 'meeting.info_updated';

  constructor(
    public readonly meetingId: string,
    public readonly title: string,
    public readonly oldDepartmentId: string,
    public readonly newDepartmentId: string,
  ) {
    super({ meetingId, title, oldDepartmentId, newDepartmentId });
  }
}
