import { IsString, IsUUID } from 'class-validator';

export class WsOpenSessionDto {
  @IsUUID()
  meetingId: string;

  @IsString()
  token: string;
}
