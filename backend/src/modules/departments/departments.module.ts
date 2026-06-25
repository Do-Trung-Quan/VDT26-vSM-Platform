import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Department } from './domain/entities/department.entity';
import { DEPARTMENT_REPOSITORY } from './departments.tokens';
import { DepartmentRepository } from './infrastructure/repositories/department.repository';

import { UsersModule } from '../users/users.module';

import { ListDepartmentsHandler } from './application/query/list-departments.handler';
import { CreateDepartmentHandler } from './application/command/create-department.handler';
import { UpdateDepartmentHandler } from './application/command/update-department.handler';
import { DeleteDepartmentHandler } from './application/command/delete-department.handler';
import { RestoreDepartmentHandler } from './application/command/restore-department.handler';

import { AdminDepartmentsController } from './presentation/admin-departments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Department]),
    // USER_REPOSITORY để kiểm tra nhân sự trước khi xóa, và lấy userCount
    UsersModule,
  ],
  providers: [
    { provide: DEPARTMENT_REPOSITORY, useClass: DepartmentRepository },
    ListDepartmentsHandler,
    CreateDepartmentHandler,
    UpdateDepartmentHandler,
    DeleteDepartmentHandler,
    RestoreDepartmentHandler,
  ],
  controllers: [AdminDepartmentsController],
  exports: [DEPARTMENT_REPOSITORY],
})
export class DepartmentsModule {}
