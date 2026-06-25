import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '../../domain/ports/user.repository.port';
import { IRefreshTokenRepository } from '../../../auth/domain/ports/refresh-token.repository.port';
import { USER_REPOSITORY } from '../../users.tokens';
import { REFRESH_TOKEN_REPOSITORY } from '../../../auth/auth.tokens';
import { SetUserStatusDto } from '../dto/set-user-status.dto';

@Injectable()
export class SetUserStatusHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(userId: string, dto: SetUserStatusDto): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    if (dto.isActive) {
      user.activate();
    } else {
      user.deactivate();
      await this.refreshTokenRepo.revokeAllByUserId(userId);
    }

    await this.userRepo.save(user);
  }
}
