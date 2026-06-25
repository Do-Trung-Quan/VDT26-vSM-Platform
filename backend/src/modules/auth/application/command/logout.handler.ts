import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { IRefreshTokenRepository } from '../../domain/ports/refresh-token.repository.port';
import { REFRESH_TOKEN_REPOSITORY } from '../../auth.tokens';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

@Injectable()
export class LogoutHandler {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(dto: RefreshTokenDto): Promise<void> {
    const tokenHash = createHash('sha256').update(dto.refreshToken).digest('hex');
    const token = await this.refreshTokenRepo.findByHash(tokenHash);

    if (!token || token.isRevoked) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    token.revoke();
    await this.refreshTokenRepo.save(token);
  }
}
