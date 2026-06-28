import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateMeetingInfoRequestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
