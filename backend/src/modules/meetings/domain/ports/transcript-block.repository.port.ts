import { TranscriptBlock } from '../entities/transcript-block.entity';

export interface FullTextSearchOptions {
  keyword: string;
  departmentId: string | null;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
}

export interface ITranscriptBlockRepository {
  bulkSave(blocks: TranscriptBlock[]): Promise<void>;
  findByMeeting(meetingId: string): Promise<TranscriptBlock[]>;
  fullTextSearch(options: FullTextSearchOptions): Promise<{ items: TranscriptBlock[]; total: number }>;
  updateSpeakerLabelFrom(meetingId: string, fromSequence: number, newLabel: string): Promise<void>;
}
