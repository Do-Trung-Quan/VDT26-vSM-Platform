import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { User } from './domain/entities/user.entity';
import { USER_REPOSITORY } from './users.tokens';
import { UserRepository } from './infrastructure/repositories/user.repository';

import { AuthModule } from '../auth/auth.module';
import { MailerModule } from '../../shared/mailer/mailer.module';
import { ObjectStorageModule } from '../../shared/object-storage/object-storage.module';

import { CreateUserHandler } from './application/command/create-user.handler';
import { UpdateUserHandler } from './application/command/update-user.handler';
import { SetUserStatusHandler } from './application/command/set-user-status.handler';
import { ChangePasswordHandler } from './application/command/change-password.handler';
import { UpdateAvatarHandler } from './application/command/update-avatar.handler';
import { GetMyProfileHandler } from './application/query/get-my-profile.handler';
import { ListUsersHandler } from './application/query/list-users.handler';

import { MeController } from './presentation/me.controller';
import { AdminUsersController } from './presentation/admin-users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // PasswordHashService + REFRESH_TOKEN_REPOSITORY từ AuthModule
    AuthModule,
    // MAILER_PORT → SmtpMailerAdapter (sync, phù hợp cho admin tạo user)
    MailerModule,
    // OBJECT_STORAGE_PORT → MinioObjectStorageAdapter
    ObjectStorageModule,
    // Multer lưu file vào memory buffer để upload lên MinIO
    MulterModule.register({ storage: memoryStorage() }),
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepository },
    CreateUserHandler,
    UpdateUserHandler,
    SetUserStatusHandler,
    ChangePasswordHandler,
    UpdateAvatarHandler,
    GetMyProfileHandler,
    ListUsersHandler,
  ],
  controllers: [MeController, AdminUsersController],
  exports: [USER_REPOSITORY, TypeOrmModule],
})
export class UsersModule {}
