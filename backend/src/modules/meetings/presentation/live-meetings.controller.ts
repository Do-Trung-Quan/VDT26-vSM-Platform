import { Body, Controller, HttpCode, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { CreateLiveMeetingRequestDto } from '../application/dto/requestDto/CreateLiveMeetingRequestDto';
import { UploadAudioMeetingRequestDto } from '../application/dto/requestDto/UploadAudioMeetingRequestDto';
import { CreateLiveMeetingHandler } from '../application/command/create-live-meeting.handler';
import { UploadAudioMeetingHandler } from '../application/command/upload-audio-meeting.handler';

@Controller('meetings')
export class LiveMeetingsController {
  constructor(
    private readonly createLiveHandler: CreateLiveMeetingHandler,
    private readonly uploadHandler: UploadAudioMeetingHandler,
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

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 2 } })
  @UseInterceptors(FileInterceptor('audio_file', { storage: memoryStorage() }))
  upload(
    @Body() dto: UploadAudioMeetingRequestDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.uploadHandler.execute(dto, file, user);
  }
}
