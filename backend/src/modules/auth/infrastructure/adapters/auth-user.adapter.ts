import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../users/domain/entities/user.entity';
import { IAuthUserPort } from '../../domain/ports/auth-user.port';

/**
 * Adapter nhẹ để auth module đọc/ghi User mà không phụ thuộc UsersModule (Phase 3 chưa sẵn sàng).
 * Chỉ expose đúng 3 thao tác auth cần: findByEmail, findById, updatePasswordHash.
 */
@Injectable()
export class AuthUserAdapter implements IAuthUserPort {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findActiveByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email, isActive: true } });
  }

  async findActiveById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id, isActive: true } });
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.userRepo.update({ id: userId }, { passwordHash });
  }
}
