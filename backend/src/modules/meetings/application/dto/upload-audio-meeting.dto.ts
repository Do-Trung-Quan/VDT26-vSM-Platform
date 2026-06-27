import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UploadAudioMeetingDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
  // audio_file được nhận qua @UploadedFile() trong controller — không khai báo ở đây
}
