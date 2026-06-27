import { Body, Controller, HttpCode, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { CreateLiveMeetingDto } from '../application/dto/create-live-meeting.dto';
import { UploadAudioMeetingDto } from '../application/dto/upload-audio-meeting.dto';
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
  createLive(
    @Body() dto: CreateLiveMeetingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.createLiveHandler.execute(dto, user);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('audio_file', { storage: memoryStorage() }))
  upload(
    @Body() dto: UploadAudioMeetingDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.uploadHandler.execute(dto, file, user);
  }
}
