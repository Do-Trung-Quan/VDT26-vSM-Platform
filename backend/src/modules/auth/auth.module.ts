import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './domain/entities/refresh-token.entity';
import { PasswordResetOtp } from './domain/entities/password-reset-otp.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken, PasswordResetOtp])],
  exports: [TypeOrmModule],
})
export class AuthModule {}
