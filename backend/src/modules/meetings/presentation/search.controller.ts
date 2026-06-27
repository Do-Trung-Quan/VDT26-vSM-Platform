import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DepartmentScopeGuard } from '../../../common/guards/department-scope.guard';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { FullTextSearchHandler } from '../application/query/full-text-search.handler';
import { Transform } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

@Controller('meetings')
@UseGuards(DepartmentScopeGuard)
export class SearchController {
  constructor(private readonly fullTextSearchHandler: FullTextSearchHandler) {}

  @Get('full-text-search')
  search(@CurrentUser() user: CurrentUserPayload, @Query() query: FullTextSearchQueryDto) {
    const deptScope = user.role === 'ADMIN' ? null : user.departmentId;
    return this.fullTextSearchHandler.execute(
      { keyword: query.keyword, departmentId: query.departmentId, fromDate: query.fromDate, toDate: query.toDate, page: query.page, limit: query.limit },
      deptScope,
    );
  }
}
