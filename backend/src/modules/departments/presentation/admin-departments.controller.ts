import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ParseUuidOr400Pipe } from '../../../common/pipes/parse-uuid-or-400.pipe';
import { UserRole } from '../../users/domain/entities/user.entity';
import { ListDepartmentsHandler } from '../application/query/list-departments.handler';
import { CreateDepartmentHandler } from '../application/command/create-department.handler';
import { UpdateDepartmentHandler } from '../application/command/update-department.handler';
import { DeleteDepartmentHandler } from '../application/command/delete-department.handler';
import { RestoreDepartmentHandler } from '../application/command/restore-department.handler';
import { ListDepartmentsQueryDto } from '../application/dto/list-departments-query.dto';
import { CreateDepartmentDto } from '../application/dto/create-department.dto';
import { UpdateDepartmentDto } from '../application/dto/update-department.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/departments')
export class AdminDepartmentsController {
  constructor(
    private readonly listHandler: ListDepartmentsHandler,
    private readonly createHandler: CreateDepartmentHandler,
    private readonly updateHandler: UpdateDepartmentHandler,
    private readonly deleteHandler: DeleteDepartmentHandler,
    private readonly restoreHandler: RestoreDepartmentHandler,
  ) {}

  @Get()
  list(@Query() query: ListDepartmentsQueryDto) {
    return this.listHandler.execute(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDepartmentDto) {
    return this.createHandler.execute(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUuidOr400Pipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.updateHandler.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async softDelete(
    @Param('id', ParseUuidOr400Pipe) id: string,
  ): Promise<{ message: string }> {
    await this.deleteHandler.execute(id);
    return { message: 'Xóa phòng ban thành công' };
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(@Param('id', ParseUuidOr400Pipe) id: string) {
    return this.restoreHandler.execute(id);
  }
}
