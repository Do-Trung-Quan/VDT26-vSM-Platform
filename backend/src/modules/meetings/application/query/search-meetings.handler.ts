import { Inject, Injectable } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { SearchMeetingsRequestDto } from '../dto/requestDto/ListMeetingsRequestDto';
import { MeetingListItemResponseDto, MeetingListResponseDto } from '../dto/responseDto/MeetingListItemResponseDto';

@Injectable()
export class SearchMeetingsHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
  ) {}

  async execute(
    keyword: string,
    departmentScope: string | null,
    query: SearchMeetingsRequestDto,
  ): Promise<MeetingListResponseDto> {
    const { items, total } = await this.meetingRepo.searchByTitle(
      keyword, departmentScope, query.page, query.limit,
    );

    return {
      items: items.map(MeetingListItemResponseDto.from),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
