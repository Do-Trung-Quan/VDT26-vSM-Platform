import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UploadAudioMeetingRequestDto {
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

  /** Thời điểm bắt đầu cuộc họp — do FE gửi lên từ date/time picker của form upload */
  @IsOptional()
  @IsDateString()
  startedAt?: string;
  // audio_file nhận qua @UploadedFile() trong controller
}
