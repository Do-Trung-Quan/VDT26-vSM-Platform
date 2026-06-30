import { IsUUID } from 'class-validator';

export class WsAudioChunkDto {
  @IsUUID()
  meetingId: string;

  /** PCM binary đã được serialize thành array of numbers hoặc Buffer từ client. */
  audio: number[] | Buffer;
}
