import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentUserPayload } from '../../../../common/decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
  role: 'USER' | 'ADMIN';
  departmentId: string;
}

/**
 * Passport strategy 'jwt' — validate access_token từ Authorization: Bearer header.
 * Kết quả trả về gắn vào request.user và được dùng bởi @CurrentUser() decorator.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  validate(payload: JwtPayload): CurrentUserPayload {
    return {
      id: payload.sub,
      role: payload.role,
      departmentId: payload.departmentId,
    };
  }
}
