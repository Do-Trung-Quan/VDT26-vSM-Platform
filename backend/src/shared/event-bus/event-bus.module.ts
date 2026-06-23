import { Module } from '@nestjs/common';
import { QueueModule } from '../../queue/queue.module';
import { EVENT_PUBLISHER_PORT } from './event-bus.tokens';
import { BullmqEventPublisherAdapter } from './publishers/bullmq-event-publisher.adapter';

@Module({
  imports: [QueueModule],
  providers: [
    { provide: EVENT_PUBLISHER_PORT, useClass: BullmqEventPublisherAdapter },
  ],
  exports: [EVENT_PUBLISHER_PORT],
})
export class EventBusModule {}
