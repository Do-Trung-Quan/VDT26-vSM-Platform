import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateLiveMeetingRequestDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Chỉ Admin truyền; User bị ép theo departmentId của mình */
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
