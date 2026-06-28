import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ParseUuidOr400Pipe } from '../../../common/pipes/parse-uuid-or-400.pipe';
import { UserRole } from '../../users/domain/entities/user.entity';
import { ListMeetingsRequestDto } from '../application/dto/requestDto/ListMeetingsRequestDto';
import { UpdateMeetingInfoRequestDto } from '../application/dto/requestDto/UpdateMeetingInfoRequestDto';
import { ListAllMeetingsHandler } from '../application/query/list-all-meetings.handler';
import { UpdateMeetingInfoHandler } from '../application/command/update-meeting-info.handler';
import { RestoreMeetingHandler } from '../application/command/restore-meeting.handler';
import { LockMeetingHandler } from '../application/command/lock-meeting.handler';

@Roles(UserRole.ADMIN)
@Controller('admin/meetings')
export class AdminMeetingsController {
  constructor(
    private readonly listAllHandler: ListAllMeetingsHandler,
    private readonly updateInfoHandler: UpdateMeetingInfoHandler,
    private readonly restoreHandler: RestoreMeetingHandler,
    private readonly lockHandler: LockMeetingHandler,
  ) {}

  @Get()
  listAll(@Query() query: ListMeetingsRequestDto) {
    return this.listAllHandler.execute(query);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUuidOr400Pipe) id: string,
    @Body() dto: UpdateMeetingInfoRequestDto,
  ) {
    return this.updateInfoHandler.execute(id, dto);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id', ParseUuidOr400Pipe) id: string) {
    await this.restoreHandler.execute(id);
    return { message: 'Khôi phục cuộc họp thành công' };
  }

  @Patch(':id/lock')
  @HttpCode(HttpStatus.OK)
  lock(
    @Param('id', ParseUuidOr400Pipe) id: string,
    @Body('isLocked') isLocked: boolean,
  ) {
    return this.lockHandler.execute(id, isLocked);
  }
}
