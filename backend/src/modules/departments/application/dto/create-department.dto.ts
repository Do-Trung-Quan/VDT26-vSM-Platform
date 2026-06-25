import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  address: string;

  @IsOptional()
  @IsString()
  description?: string;
}
