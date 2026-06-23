import { DomainEventBase } from '../../../common/domain/domain-event.base';

export interface IEventPublisherPort {
  publish(event: DomainEventBase): Promise<void>;
}
