import { IsInt, IsString, IsUUID, Min } from 'class-validator';

export class WsResumeDto {
  @IsUUID()
  meetingId: string;

  @IsString()
  token: string;

  @IsInt()
  @Min(0)
  lastReceivedSequence: number;
}
