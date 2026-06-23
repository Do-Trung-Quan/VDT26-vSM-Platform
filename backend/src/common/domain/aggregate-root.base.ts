import { DomainEventBase } from './domain-event.base';

export abstract class AggregateRootBase {
  private readonly domainEvents: DomainEventBase[] = [];

  protected addDomainEvent(event: DomainEventBase): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEventBase[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }
}
