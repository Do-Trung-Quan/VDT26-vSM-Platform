import { PasswordResetOtp } from '../entities/password-reset-otp.entity';

export interface IPasswordResetOtpRepository {
  save(otp: PasswordResetOtp): Promise<void>;
  findActiveByUserId(userId: string): Promise<PasswordResetOtp | null>;
  markAllUsedByUserId(userId: string): Promise<void>;
}
