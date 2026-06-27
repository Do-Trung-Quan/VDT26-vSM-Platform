import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateLiveMeetingDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string; // chỉ Admin truyền; User bị ép theo dept của mình
}
