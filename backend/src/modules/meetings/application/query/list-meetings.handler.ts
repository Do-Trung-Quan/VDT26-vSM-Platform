import { Inject, Injectable } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { ListMeetingsRequestDto } from '../dto/requestDto/ListMeetingsRequestDto';
import { MeetingListItemResponseDto, MeetingListResponseDto } from '../dto/responseDto/MeetingListItemResponseDto';

@Injectable()
export class ListMeetingsHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
  ) {}

  async execute(departmentId: string, query: ListMeetingsRequestDto): Promise<MeetingListResponseDto> {
    const { items, total } = await this.meetingRepo.listByDepartment(departmentId, {
      page: query.page, limit: query.limit,
      status: query.status, fromDate: query.fromDate, toDate: query.toDate,
      deletedStatus: 'active', // user endpoint luôn chỉ hiện active
    });

    return {
      items: items.map(MeetingListItemResponseDto.from),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
