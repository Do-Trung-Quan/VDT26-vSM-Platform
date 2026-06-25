import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { RefreshToken } from './domain/entities/refresh-token.entity';
import { PasswordResetOtp } from './domain/entities/password-reset-otp.entity';
import { User } from '../users/domain/entities/user.entity';

import { REFRESH_TOKEN_REPOSITORY, PASSWORD_RESET_OTP_REPOSITORY, AUTH_USER_PORT } from './auth.tokens';
import { RefreshTokenRepository } from './infrastructure/repositories/refresh-token.repository';
import { PasswordResetOtpRepository } from './infrastructure/repositories/password-reset-otp.repository';
import { AuthUserAdapter } from './infrastructure/adapters/auth-user.adapter';
import { AsyncMailerAdapter } from './infrastructure/adapters/async-mailer.adapter';
import { MailProcessor } from './infrastructure/processors/mail.processor';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';

import { SmtpMailerAdapter } from '../../shared/mailer/adapters/smtp-mailer.adapter';
import { MAILER_PORT } from '../../shared/mailer/mailer.tokens';
import { QUEUE_NAMES } from '../../queue/queue.constants';

import { TokenService } from './application/services/token.service';
import { PasswordHashService } from './application/services/password-hash.service';
import { LoginHandler } from './application/command/login.handler';
import { RefreshTokenHandler } from './application/command/refresh-token.handler';
import { LogoutHandler } from './application/command/logout.handler';
import { ForgotPasswordHandler } from './application/command/forgot-password.handler';
import { ResetPasswordHandler } from './application/command/reset-password.handler';

import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, PasswordResetOtp, User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: { expiresIn: configService.get<string>('jwt.accessExpiresIn') },
      }),
    }),
    // Đăng ký queue mail-otp cho AsyncMailerAdapter và MailProcessor
    BullModule.registerQueue({ name: QUEUE_NAMES.MAIL_OTP }),
  ],
  providers: [
    // Port bindings
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
    { provide: PASSWORD_RESET_OTP_REPOSITORY, useClass: PasswordResetOtpRepository },
    { provide: AUTH_USER_PORT, useClass: AuthUserAdapter },
    // MAILER_PORT → AsyncMailerAdapter (enqueue) thay vì gửi trực tiếp
    { provide: MAILER_PORT, useClass: AsyncMailerAdapter },
    // SmtpMailerAdapter dùng bởi MailProcessor để gửi thực sự
    SmtpMailerAdapter,
    // Infrastructure
    JwtStrategy,
    MailProcessor,
    // Services
    TokenService,
    PasswordHashService,
    // Handlers
    LoginHandler,
    RefreshTokenHandler,
    LogoutHandler,
    ForgotPasswordHandler,
    ResetPasswordHandler,
  ],
  controllers: [AuthController],
  exports: [PasswordHashService, TypeOrmModule, REFRESH_TOKEN_REPOSITORY],
})
export class AuthModule {}
