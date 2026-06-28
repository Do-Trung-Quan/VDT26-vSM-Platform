import { TranscriptBlock } from '../../../domain/entities/transcript-block.entity';

export class TranscriptBlockResponseDto {
  id: string;
  sequenceNumber: number;
  text: string;
  speakerLabel: string;
  startTime: number;
  endTime: number;

  static from(b: TranscriptBlock): TranscriptBlockResponseDto {
    const dto = new TranscriptBlockResponseDto();
    dto.id             = b.id;
    dto.sequenceNumber = b.sequenceNumber;
    dto.text           = b.text;
    dto.speakerLabel   = b.speakerLabel;
    dto.startTime      = b.startTime;
    dto.endTime        = b.endTime;
    return dto;
  }
}
