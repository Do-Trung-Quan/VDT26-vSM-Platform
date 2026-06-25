import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from './domain/entities/meeting.entity';
import { TranscriptBlock } from './domain/entities/transcript-block.entity';
import { MeetingSummary } from './domain/entities/meeting-summary.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting, TranscriptBlock, MeetingSummary])],
  exports: [TypeOrmModule],
})
export class MeetingsModule {}
