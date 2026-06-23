import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IEventPublisherPort } from '../ports/event-publisher.port';
import { DomainEventBase } from '../../../common/domain/domain-event.base';
import { QUEUE_NAMES, JOB_NAMES } from '../../../queue/queue.constants';

/**
 * Đẩy domain event vào queue Redis 'domain-events' — đảm bảo không mất khi restart
 * (BullMQ job persist trên Redis cho tới khi consumer xử lý xong).
 */
@Injectable()
export class BullmqEventPublisherAdapter implements IEventPublisherPort {
  constructor(
    @InjectQueue(QUEUE_NAMES.DOMAIN_EVENTS) private readonly domainEventsQueue: Queue,
  ) {}

  async publish(event: DomainEventBase): Promise<void> {
    await this.domainEventsQueue.add(JOB_NAMES.PUBLISH_DOMAIN_EVENT, {
      eventName: event.eventName,
      occurredAt: event.occurredAt,
      payload: event.payload,
    });
  }
}
