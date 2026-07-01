import {
  BadRequestException, Body, Controller,
  HttpCode, HttpStatus, Post, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { CreateLiveMeetingRequestDto } from '../application/dto/requestDto/CreateLiveMeetingRequestDto';
import { UploadAudioMeetingRequestDto } from '../application/dto/requestDto/UploadAudioMeetingRequestDto';
import { CreateLiveMeetingHandler } from '../application/command/create-live-meeting.handler';
import { UploadAudioMeetingHandler } from '../application/command/upload-audio-meeting.handler';
import { InitUploadAudioHandler, InitUploadAudioRequestDto } from '../application/command/init-upload-audio.handler';
import { CompleteUploadAudioHandler, CompleteUploadAudioRequestDto } from '../application/command/complete-upload-audio.handler';

const ALLOWED_MIMES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav'];
const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB

@Controller('meetings')
export class LiveMeetingsController {
  constructor(
    private readonly createLiveHandler:    CreateLiveMeetingHandler,
    private readonly uploadHandler:        UploadAudioMeetingHandler,
    private readonly initUploadHandler:    InitUploadAudioHandler,
    private readonly completeUploadHandler: CompleteUploadAudioHandler,
  ) {}

  @Post('live')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  createLive(
    @Body() dto: CreateLiveMeetingRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.createLiveHandler.execute(dto, user);
  }

  // ── Presigned URL upload (2-step, bypass proxy) ─────────────────────────────

  @Post('upload/init')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  uploadInit(
    @Body() dto: InitUploadAudioRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.initUploadHandler.execute(dto, user);
  }

  @Post('upload/complete')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  uploadComplete(
    @Body() dto: CompleteUploadAudioRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.completeUploadHandler.execute(dto, user);
  }

  // ── Legacy: direct multipart upload (dùng cho test script ws-test-upload-batch.js) ──

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 2 } })
  @UseInterceptors(FileInterceptor('audio_file', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES },
  }))
  upload(
    @Body() dto: UploadAudioMeetingRequestDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) throw new BadRequestException('Vui lòng đính kèm file audio (audio_file)');
    const ext = (file.originalname ?? '').split('.').pop()?.toLowerCase();
    if (!ALLOWED_MIMES.includes(file.mimetype) && ext !== 'mp3' && ext !== 'wav') {
      throw new BadRequestException('Chỉ chấp nhận file MP3 hoặc WAV');
    }
    return this.uploadHandler.execute(dto, file, user);
  }
}
