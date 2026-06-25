import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { GetMyProfileHandler } from '../application/query/get-my-profile.handler';
import { ChangePasswordHandler } from '../application/command/change-password.handler';
import { UpdateAvatarHandler } from '../application/command/update-avatar.handler';
import { ChangePasswordDto } from '../application/dto/change-password.dto';

@Controller('users/me')
export class MeController {
  constructor(
    private readonly getMyProfileHandler: GetMyProfileHandler,
    private readonly changePasswordHandler: ChangePasswordHandler,
    private readonly updateAvatarHandler: UpdateAvatarHandler,
  ) {}

  @Get()
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.getMyProfileHandler.execute(user.id);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.changePasswordHandler.execute(user.id, dto);
    return { message: 'Đổi mật khẩu thành công' };
  }

  @Patch('avatar')
  @UseInterceptors(FileInterceptor('file'))
  updateAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.updateAvatarHandler.execute(user.id, file);
  }
}
