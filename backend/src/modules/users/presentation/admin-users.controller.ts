import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../domain/entities/user.entity';
import { ParseUuidOr400Pipe } from '../../../common/pipes/parse-uuid-or-400.pipe';
import { ListUsersHandler } from '../application/query/list-users.handler';
import { CreateUserHandler } from '../application/command/create-user.handler';
import { UpdateUserHandler } from '../application/command/update-user.handler';
import { SetUserStatusHandler } from '../application/command/set-user-status.handler';
import { ListUsersQueryDto } from '../application/dto/list-users-query.dto';
import { CreateUserDto } from '../application/dto/create-user.dto';
import { UpdateUserDto } from '../application/dto/update-user.dto';
import { SetUserStatusDto } from '../application/dto/set-user-status.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly listUsersHandler: ListUsersHandler,
    private readonly createUserHandler: CreateUserHandler,
    private readonly updateUserHandler: UpdateUserHandler,
    private readonly setUserStatusHandler: SetUserStatusHandler,
  ) {}

  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.listUsersHandler.execute(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.createUserHandler.execute(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUuidOr400Pipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.updateUserHandler.execute(id, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async setStatus(
    @Param('id', ParseUuidOr400Pipe) id: string,
    @Body() dto: SetUserStatusDto,
  ): Promise<{ message: string }> {
    await this.setUserStatusHandler.execute(id, dto);
    const msg = dto.isActive ? 'Kích hoạt tài khoản thành công' : 'Vô hiệu hóa tài khoản thành công';
    return { message: msg };
  }
}
