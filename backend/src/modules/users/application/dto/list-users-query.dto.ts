import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  // @Type(() => Boolean) không xử lý đúng string "false" → Boolean("false") = true
  // Dùng @Transform để parse thủ công từ query string
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}
