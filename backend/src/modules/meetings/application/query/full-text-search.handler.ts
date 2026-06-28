import { Inject, Injectable } from '@nestjs/common';
import { ITranscriptBlockRepository } from '../../domain/ports/transcript-block.repository.port';
import { TRANSCRIPT_BLOCK_REPOSITORY } from '../../meetings.tokens';
import { TranscriptBlockResponseDto } from '../dto/responseDto/TranscriptBlockResponseDto';

export interface FullTextSearchQuery {
  keyword: string;
  departmentId?: string;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
}

export interface FullTextSearchResponseDto {
  items: TranscriptBlockResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FullTextSearchHandler {
  constructor(
    @Inject(TRANSCRIPT_BLOCK_REPOSITORY) private readonly blockRepo: ITranscriptBlockRepository,
  ) {}

  async execute(query: FullTextSearchQuery, departmentScope: string | null): Promise<FullTextSearchResponseDto> {
    const { items, total } = await this.blockRepo.fullTextSearch({
      keyword: query.keyword,
      departmentId: departmentScope ?? query.departmentId ?? null,
      fromDate: query.fromDate, toDate: query.toDate,
      page: query.page, limit: query.limit,
    });

    return {
      items: items.map(TranscriptBlockResponseDto.from),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
