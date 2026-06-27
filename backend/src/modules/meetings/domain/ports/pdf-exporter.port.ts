import { Meeting } from '../entities/meeting.entity';
import { TranscriptBlock } from '../entities/transcript-block.entity';

export interface IPdfExporterPort {
  export(meeting: Meeting, transcript: TranscriptBlock[]): Promise<Buffer>;
}
