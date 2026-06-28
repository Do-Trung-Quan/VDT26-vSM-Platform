import {
  Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Query, UseGuards,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { DepartmentScopeGuard } from '../../../common/guards/department-scope.guard';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUuidOr400Pipe } from '../../../common/pipes/parse-uuid-or-400.pipe';
import { ListMeetingsRequestDto, SearchMeetingsRequestDto } from '../application/dto/requestDto/ListMeetingsRequestDto';
import { ListMeetingsHandler } from '../application/query/list-meetings.handler';
import { GetMeetingDetailHandler } from '../application/query/get-meeting-detail.handler';
import { GetTranscriptHandler } from '../application/query/get-transcript.handler';
import { SearchMeetingsHandler } from '../application/query/search-meetings.handler';
import { FullTextSearchHandler, FullTextSearchQuery } from '../application/query/full-text-search.handler';
import { SoftDeleteMeetingHandler } from '../application/command/soft-delete-meeting.handler';

/** DTO nội bộ cho full-text-search — không cần tạo file riêng vì chỉ dùng ở controller này */
class FullTextSearchQueryDto {
  @IsString()
  keyword: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  fromDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  toDate?: Date;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

@Controller('meetings')
@UseGuards(DepartmentScopeGuard)
export class MeetingsController {
  constructor(
    private readonly listHandler: ListMeetingsHandler,
    private readonly detailHandler: GetMeetingDetailHandler,
    private readonly transcriptHandler: GetTranscriptHandler,
    private readonly searchHandler: SearchMeetingsHandler,
    private readonly fullTextSearchHandler: FullTextSearchHandler,
    private readonly softDeleteHandler: SoftDeleteMeetingHandler,
  ) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Query() query: ListMeetingsRequestDto) {
    return this.listHandler.execute(user.departmentId, query);
  }

  // ── Static routes TRƯỚC @Get(':id') ──

  @Get('search')
  search(@CurrentUser() user: CurrentUserPayload, @Query() query: SearchMeetingsRequestDto) {
    const deptScope = user.role === 'ADMIN' ? null : user.departmentId;
    return this.searchHandler.execute(query.keyword ?? '', deptScope, query);
  }

  @Get('full-text-search')
  fullTextSearch(@CurrentUser() user: CurrentUserPayload, @Query() query: FullTextSearchQueryDto) {
    const deptScope = user.role === 'ADMIN' ? null : user.departmentId;
    const searchQuery: FullTextSearchQuery = {
      keyword: query.keyword,
      departmentId: query.departmentId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      page: query.page,
      limit: query.limit,
    };
    return this.fullTextSearchHandler.execute(searchQuery, deptScope);
  }

  // ── Dynamic routes ──

  @Get(':id')
  detail(@Param('id', ParseUuidOr400Pipe) id: string) {
    return this.detailHandler.execute(id);
  }

  @Get(':id/transcript')
  transcript(@Param('id', ParseUuidOr400Pipe) id: string) {
    return this.transcriptHandler.execute(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async softDelete(
    @Param('id', ParseUuidOr400Pipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ message: string }> {
    await this.softDeleteHandler.execute(id, user);
    return { message: 'Xóa cuộc họp thành công' };
  }
}
