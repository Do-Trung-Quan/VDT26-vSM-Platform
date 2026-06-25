import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { DepartmentStatusFilter } from '../../domain/ports/department.repository.port';

export class ListDepartmentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['all', 'active', 'deleted'])
  status?: DepartmentStatusFilter;
}
