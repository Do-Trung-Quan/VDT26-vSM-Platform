import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../../common/dto/pagination-query.dto';
import { MeetingStatus } from '../../../domain/entities/meeting.entity';
import { DeletedStatusFilter } from '../../../domain/ports/meeting.repository.port';

export class ListMeetingsRequestDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;

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

  /** Chỉ dùng cho admin: 'all' | 'active' | 'deleted' */
  @IsOptional()
  @IsIn(['all', 'active', 'deleted'] satisfies DeletedStatusFilter[])
  deletedStatus?: DeletedStatusFilter;
}

/** DTO tìm kiếm theo title */
export class SearchMeetingsRequestDto {
  @IsOptional()
  @IsString()
  keyword?: string;
}
