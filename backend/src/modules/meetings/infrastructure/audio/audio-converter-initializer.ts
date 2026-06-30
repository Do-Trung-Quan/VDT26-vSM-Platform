import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AudioConverter } from './audio-converter';

/** Gọi AudioConverter.init() 1 lần khi MeetingsModule khởi động. */
@Injectable()
export class AudioConverterInitializer implements OnModuleInit {
  private readonly logger = new Logger(AudioConverterInitializer.name);

  constructor(private readonly cfg: ConfigService) {}

  onModuleInit(): void {
    const path = this.cfg.get<string>('transcription.ffmpegPath') ?? 'ffmpeg';
    AudioConverter.init(path);
    this.logger.log(`FFmpeg path set to: ${path}`);
  }
}
