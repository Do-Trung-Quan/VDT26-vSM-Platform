import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { PasswordResetOtp } from '../../domain/entities/password-reset-otp.entity';
import { IAuthUserPort } from '../../domain/ports/auth-user.port';
import { IPasswordResetOtpRepository } from '../../domain/ports/password-reset-otp.repository.port';
import { AUTH_USER_PORT, PASSWORD_RESET_OTP_REPOSITORY } from '../../auth.tokens';
import { MAILER_PORT } from '../../../../shared/mailer/mailer.tokens';
import { IMailerPort } from '../../../../shared/mailer/ports/mailer.port';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';

@Injectable()
export class ForgotPasswordHandler {
  private readonly otpTtlMinutes: number;
  private readonly otpCooldownSeconds: number;

  constructor(
    @Inject(AUTH_USER_PORT) private readonly authUserPort: IAuthUserPort,
    @Inject(PASSWORD_RESET_OTP_REPOSITORY)
    private readonly otpRepo: IPasswordResetOtpRepository,
    @Inject(MAILER_PORT) private readonly mailer: IMailerPort,
    configService: ConfigService,
  ) {
    this.otpTtlMinutes = configService.get<number>('OTP_TTL_MINUTES', 10);
    this.otpCooldownSeconds = configService.get<number>('OTP_COOLDOWN_SECONDS', 60);
  }

  async execute(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.authUserPort.findActiveByEmail(dto.email);

    // Anti-enumeration: không tiết lộ email có tồn tại hay không
    if (!user) return;

    // Rate limiting: kiểm tra OTP gần nhất còn hiệu lực
    const existingOtp = await this.otpRepo.findActiveByUserId(user.id);
    if (existingOtp) {
      const secondsSinceCreated = (Date.now() - existingOtp.createdAt.getTime()) / 1000;
      if (secondsSinceCreated < this.otpCooldownSeconds) {
        const waitSeconds = Math.ceil(this.otpCooldownSeconds - secondsSinceCreated);
        throw new BadRequestException(
          `Vui lòng đợi ${waitSeconds} giây trước khi yêu cầu mã OTP mới`,
        );
      }
    }

    // Hủy tất cả OTP cũ rồi tạo mới
    await this.otpRepo.markAllUsedByUserId(user.id);

    const otpCode = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + this.otpTtlMinutes * 60 * 1000);

    const otp = new PasswordResetOtp();
    otp.userId = user.id;
    otp.otpCode = otpCode;
    otp.isUsed = false;
    otp.expiresAt = expiresAt;

    await this.otpRepo.save(otp);

    // Fire-and-forget: đẩy vào BullMQ, trả response ngay lập tức
    await this.mailer.sendOtpEmail(user.email, otpCode);
  }
}
