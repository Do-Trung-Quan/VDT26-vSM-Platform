export abstract class DomainEventBase {
  abstract readonly eventName: string;
  readonly occurredAt: Date = new Date();

  constructor(public readonly payload: Record<string, unknown>) {}
}
