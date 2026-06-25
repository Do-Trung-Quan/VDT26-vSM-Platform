import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { IAuthUserPort } from '../../domain/ports/auth-user.port';
import { IRefreshTokenRepository } from '../../domain/ports/refresh-token.repository.port';
import { AUTH_USER_PORT, REFRESH_TOKEN_REPOSITORY } from '../../auth.tokens';
import { TokenService } from '../services/token.service';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class RefreshTokenHandler {
  private readonly refreshTokenTtlMs: number;

  constructor(
    @Inject(AUTH_USER_PORT) private readonly authUserPort: IAuthUserPort,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.refreshTokenTtlMs = configService.get<number>('JWT_REFRESH_TTL_MS', 604800000);
  }

  async execute(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const tokenHash = createHash('sha256').update(dto.refreshToken).digest('hex');
    const existing = await this.refreshTokenRepo.findByHash(tokenHash);

    if (!existing || !existing.isValid()) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    // Rotation: revoke old, issue new
    existing.revoke();
    await this.refreshTokenRepo.save(existing);

    const rawToken = randomBytes(48).toString('hex');
    const newHash = createHash('sha256').update(rawToken).digest('hex');

    const newRefreshToken = new RefreshToken();
    newRefreshToken.userId = existing.userId;
    newRefreshToken.tokenHash = newHash;
    newRefreshToken.isRevoked = false;
    newRefreshToken.expiresAt = new Date(Date.now() + this.refreshTokenTtlMs);
    await this.refreshTokenRepo.save(newRefreshToken);

    const user = await this.authUserPort.findActiveById(existing.userId);
    if (!user) {
      throw new UnauthorizedException('Tài khoản không còn hoạt động');
    }

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      role: user.role,
      departmentId: user.departmentId,
    });

    return {
      accessToken,
      refreshToken: rawToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId,
      },
    };
  }
}
