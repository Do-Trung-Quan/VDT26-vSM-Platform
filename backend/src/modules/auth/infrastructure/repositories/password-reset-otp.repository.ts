import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { PasswordResetOtp } from '../../domain/entities/password-reset-otp.entity';
import { IPasswordResetOtpRepository } from '../../domain/ports/password-reset-otp.repository.port';

@Injectable()
export class PasswordResetOtpRepository implements IPasswordResetOtpRepository {
  constructor(
    @InjectRepository(PasswordResetOtp)
    private readonly repo: Repository<PasswordResetOtp>,
  ) {}

  async save(otp: PasswordResetOtp): Promise<void> {
    await this.repo.save(otp);
  }

  async findActiveByUserId(userId: string): Promise<PasswordResetOtp | null> {
    return this.repo.findOne({
      where: {
        userId,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async markAllUsedByUserId(userId: string): Promise<void> {
    await this.repo.update({ userId, isUsed: false }, { isUsed: true });
  }
}
