import { Inject, Injectable } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { SearchMeetingsRequestDto } from '../dto/requestDto/ListMeetingsRequestDto';
import { MeetingListItemResponseDto } from '../dto/responseDto/MeetingListItemResponseDto';

@Injectable()
export class SearchMeetingsHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
  ) {}

  async execute(
    keyword: string,
    departmentScope: string | null,
    query: SearchMeetingsRequestDto,
  ): Promise<MeetingListItemResponseDto[]> {
    const items = await this.meetingRepo.searchByTitle(keyword, departmentScope);
    return items.map(MeetingListItemResponseDto.from);
  }
}
