import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.TRANSCRIPTION_BATCH },
      { name: QUEUE_NAMES.SUMMARY_GENERATION },
      { name: QUEUE_NAMES.DOMAIN_EVENTS },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
