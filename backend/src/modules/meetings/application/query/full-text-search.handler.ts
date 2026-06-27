import { Inject, Injectable } from '@nestjs/common';
import { ITranscriptBlockRepository } from '../../domain/ports/transcript-block.repository.port';
import { TRANSCRIPT_BLOCK_REPOSITORY } from '../../meetings.tokens';
import { TranscriptBlockDto } from '../dto/transcript-block.dto';

export interface FullTextSearchQuery {
  keyword: string;
  departmentId?: string;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
}

@Injectable()
export class FullTextSearchHandler {
  constructor(
    @Inject(TRANSCRIPT_BLOCK_REPOSITORY) private readonly blockRepo: ITranscriptBlockRepository,
  ) {}

  async execute(query: FullTextSearchQuery, departmentScope: string | null) {
    const { items, total } = await this.blockRepo.fullTextSearch({
      keyword: query.keyword,
      departmentId: departmentScope ?? query.departmentId ?? null,
      fromDate: query.fromDate, toDate: query.toDate,
      page: query.page, limit: query.limit,
    });

    return {
      items: items.map((b): TranscriptBlockDto => ({
        id: b.id, sequenceNumber: b.sequenceNumber,
        text: b.text, speakerLabel: b.speakerLabel,
        startTime: b.startTime, endTime: b.endTime,
      })),
      total, page: query.page, limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
