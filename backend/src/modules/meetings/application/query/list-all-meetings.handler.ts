import { Inject, Injectable } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { ListMeetingsRequestDto } from '../dto/requestDto/ListMeetingsRequestDto';
import { MeetingListItemResponseDto, MeetingListResponseDto } from '../dto/responseDto/MeetingListItemResponseDto';

@Injectable()
export class ListAllMeetingsHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
  ) {}

  async execute(query: ListMeetingsRequestDto): Promise<MeetingListResponseDto> {
    const { items, total } = await this.meetingRepo.listAll({
      page: query.page, limit: query.limit,
      departmentId: query.departmentId, status: query.status,
      fromDate: query.fromDate, toDate: query.toDate,
      deletedStatus: query.deletedStatus ?? 'active',
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
