import { DomainEventBase } from '../../../../common/domain/domain-event.base';

export class LiveSessionEndedEvent extends DomainEventBase {
  readonly eventName = 'LiveSessionEndedEvent';

  constructor(
    public readonly meetingId: string,
    public readonly audioUrl:  string,
    public readonly durationSeconds: number,
  ) {
    super({ meetingId, audioUrl, durationSeconds });
  }
}
