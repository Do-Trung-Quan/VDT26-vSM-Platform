import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { IAuthUserPort } from '../../domain/ports/auth-user.port';
import { IPasswordResetOtpRepository } from '../../domain/ports/password-reset-otp.repository.port';
import { IRefreshTokenRepository } from '../../domain/ports/refresh-token.repository.port';
import { AUTH_USER_PORT, PASSWORD_RESET_OTP_REPOSITORY, REFRESH_TOKEN_REPOSITORY } from '../../auth.tokens';
import { PasswordHashService } from '../services/password-hash.service';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Injectable()
export class ResetPasswordHandler {
  constructor(
    @Inject(AUTH_USER_PORT) private readonly authUserPort: IAuthUserPort,
    @Inject(PASSWORD_RESET_OTP_REPOSITORY)
    private readonly otpRepo: IPasswordResetOtpRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly passwordHashService: PasswordHashService,
  ) {}

  async execute(dto: ResetPasswordDto): Promise<void> {
    const user = await this.authUserPort.findActiveByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Thông tin không hợp lệ');
    }

    const otp = await this.otpRepo.findActiveByUserId(user.id);
    if (!otp) {
      throw new BadRequestException('Mã OTP không tồn tại hoặc đã hết hạn');
    }

    if (otp.otpCode !== dto.otpCode) {
      throw new BadRequestException('Mã OTP không đúng');
    }

    if (!otp.isValid()) {
      throw new BadRequestException('Mã OTP đã hết hạn');
    }

    const isSame = await this.passwordHashService.compare(dto.newPassword, user.passwordHash);
    if (isSame) throw new BadRequestException('Mật khẩu mới không được trùng mật khẩu hiện tại');

    const newPasswordHash = await this.passwordHashService.hash(dto.newPassword);

    await this.authUserPort.updatePasswordHash(user.id, newPasswordHash);
    otp.markUsed();
    await this.otpRepo.save(otp);

    // Thu hồi tất cả refresh token để buộc đăng nhập lại trên mọi thiết bị
    await this.refreshTokenRepo.revokeAllByUserId(user.id);
  }
}
