import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { Meeting } from './domain/entities/meeting.entity';
import { TranscriptBlock } from './domain/entities/transcript-block.entity';
import { MeetingSummary } from './domain/entities/meeting-summary.entity';

import {
  MEETING_REPOSITORY,
  TRANSCRIPT_BLOCK_REPOSITORY,
  MEETING_SUMMARY_REPOSITORY,
} from './meetings.tokens';

import { MeetingRepository } from './infrastructure/repositories/meeting.repository';
import { TranscriptBlockRepository } from './infrastructure/repositories/transcript-block.repository';
import { MeetingSummaryRepository } from './infrastructure/repositories/meeting-summary.repository';

import { ObjectStorageModule } from '../../shared/object-storage/object-storage.module';
import { EventBusModule } from '../../shared/event-bus/event-bus.module';
import { QueueModule } from '../../queue/queue.module';
import { QUEUE_NAMES } from '../../queue/queue.constants';

// Command Handlers
import { CreateLiveMeetingHandler } from './application/command/create-live-meeting.handler';
import { UploadAudioMeetingHandler } from './application/command/upload-audio-meeting.handler';
import { SoftDeleteMeetingHandler } from './application/command/soft-delete-meeting.handler';
import { RestoreMeetingHandler } from './application/command/restore-meeting.handler';
import { UpdateMeetingInfoHandler } from './application/command/update-meeting-info.handler';
import { LockMeetingHandler } from './application/command/lock-meeting.handler';
import { EditSpeakerLabelHandler } from './application/command/edit-speaker-label.handler';

// Query Handlers
import { ListMeetingsHandler } from './application/query/list-meetings.handler';
import { ListAllMeetingsHandler } from './application/query/list-all-meetings.handler';
import { GetMeetingDetailHandler } from './application/query/get-meeting-detail.handler';
import { GetTranscriptHandler } from './application/query/get-transcript.handler';
import { SearchMeetingsHandler } from './application/query/search-meetings.handler';
import { GetSummaryHandler } from './application/query/get-summary.handler';
import { FullTextSearchHandler } from './application/query/full-text-search.handler';

// Controllers
import { MeetingsController } from './presentation/meetings.controller';
import { LiveMeetingsController } from './presentation/live-meetings.controller';
import { AdminMeetingsController } from './presentation/admin-meetings.controller';
import { SummaryController } from './presentation/summary.controller';
import { SearchController } from './presentation/search.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, TranscriptBlock, MeetingSummary]),
    ObjectStorageModule,
    EventBusModule,
    QueueModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.TRANSCRIPTION_BATCH }),
  ],
  providers: [
    // Repository bindings
    { provide: MEETING_REPOSITORY, useClass: MeetingRepository },
    { provide: TRANSCRIPT_BLOCK_REPOSITORY, useClass: TranscriptBlockRepository },
    { provide: MEETING_SUMMARY_REPOSITORY, useClass: MeetingSummaryRepository },

    // Command Handlers
    CreateLiveMeetingHandler,
    UploadAudioMeetingHandler,
    SoftDeleteMeetingHandler,
    RestoreMeetingHandler,
    UpdateMeetingInfoHandler,
    LockMeetingHandler,
    EditSpeakerLabelHandler,

    // Query Handlers
    ListMeetingsHandler,
    ListAllMeetingsHandler,
    GetMeetingDetailHandler,
    GetTranscriptHandler,
    SearchMeetingsHandler,
    GetSummaryHandler,
    FullTextSearchHandler,
  ],
  controllers: [
    MeetingsController,
    LiveMeetingsController,
    AdminMeetingsController,
    SummaryController,
    SearchController,
  ],
  exports: [MEETING_REPOSITORY, TRANSCRIPT_BLOCK_REPOSITORY, TypeOrmModule],
})
export class MeetingsModule { }
