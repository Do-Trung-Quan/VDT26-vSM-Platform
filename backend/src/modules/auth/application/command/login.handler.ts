import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { IAuthUserPort } from '../../domain/ports/auth-user.port';
import { IRefreshTokenRepository } from '../../domain/ports/refresh-token.repository.port';
import { AUTH_USER_PORT, REFRESH_TOKEN_REPOSITORY } from '../../auth.tokens';
import { TokenService } from '../services/token.service';
import { PasswordHashService } from '../services/password-hash.service';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class LoginHandler {
  private readonly refreshTokenTtlMs: number;

  constructor(
    @Inject(AUTH_USER_PORT) private readonly authUserPort: IAuthUserPort,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly passwordHashService: PasswordHashService,
    configService: ConfigService,
  ) {
    this.refreshTokenTtlMs = configService.get<number>('JWT_REFRESH_TTL_MS', 604800000);
  }

  async execute(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.authUserPort.findActiveByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await this.passwordHashService.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const rawToken = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const refreshToken = new RefreshToken();
    refreshToken.userId = user.id;
    refreshToken.tokenHash = tokenHash;
    refreshToken.isRevoked = false;
    refreshToken.expiresAt = new Date(Date.now() + this.refreshTokenTtlMs);

    await this.refreshTokenRepo.save(refreshToken);

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
