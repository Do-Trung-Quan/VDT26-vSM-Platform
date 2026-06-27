import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { MeetingStatus } from '../../domain/entities/meeting.entity';
import { DeletedStatusFilter } from '../../domain/ports/meeting.repository.port';

/** DTO tìm kiếm theo title — keyword là bắt buộc */
export class SearchMeetingsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class ListMeetingsQueryDto extends PaginationQueryDto {
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

  /** Chỉ dùng cho admin — lọc meetings theo trạng thái xóa mềm */
  @IsOptional()
  @IsIn(['all', 'active', 'deleted'] satisfies DeletedStatusFilter[])
  deletedStatus?: DeletedStatusFilter;
}
