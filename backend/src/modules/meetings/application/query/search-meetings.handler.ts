import { Inject, Injectable } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { MeetingDetailDto } from '../dto/meeting-detail.dto';
import { ListMeetingsResult } from './list-meetings.handler';

@Injectable()
export class SearchMeetingsHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
  ) {}

  async execute(keyword: string, departmentScope: string | null, query: PaginationQueryDto): Promise<ListMeetingsResult> {
    const { items, total } = await this.meetingRepo.searchByTitle(keyword, departmentScope, query.page, query.limit);
    return {
      items: items.map((m): MeetingDetailDto => ({
        id: m.id, title: m.title, description: m.description,
        type: m.type, status: m.status,
        hostId: m.hostId, hostName: m.host?.fullName ?? '',
        departmentId: m.departmentId, departmentName: m.department?.name ?? '',
        audioUrl: null, durationSeconds: m.durationSeconds, isLocked: m.isLocked,
        startedAt: m.startedAt?.toISOString() ?? null,
        endedAt: m.endedAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
      total, page: query.page, limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
