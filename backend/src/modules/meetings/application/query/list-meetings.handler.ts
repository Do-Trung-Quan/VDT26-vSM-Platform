import { Inject, Injectable } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { ListMeetingsQueryDto } from '../dto/list-meetings-query.dto';
import { MeetingDetailDto } from '../dto/meeting-detail.dto';

export interface ListMeetingsResult {
  items: MeetingDetailDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListMeetingsHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
  ) {}

  async execute(
    departmentId: string,
    query: ListMeetingsQueryDto,
  ): Promise<ListMeetingsResult> {
    const { items, total } = await this.meetingRepo.listByDepartment(departmentId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    return {
      items: items.map(toListItem),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}

function toListItem(m: any): MeetingDetailDto {
  return {
    id: m.id, title: m.title, description: m.description,
    type: m.type, status: m.status,
    hostId: m.hostId, hostName: m.host?.fullName ?? '',
    departmentId: m.departmentId, departmentName: m.department?.name ?? '',
    audioUrl: null, // list không trả audio URL (dùng detail endpoint)
    durationSeconds: m.durationSeconds, isLocked: m.isLocked,
    startedAt: m.startedAt?.toISOString() ?? null,
    endedAt: m.endedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}
