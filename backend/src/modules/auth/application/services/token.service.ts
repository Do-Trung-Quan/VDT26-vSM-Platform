import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../../users/domain/entities/user.entity';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  departmentId: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwtService.sign({
      sub: payload.sub,
      role: payload.role,
      departmentId: payload.departmentId,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      return this.jwtService.verify<AccessTokenPayload>(token);
    } catch {
      return null;
    }
  }
}
