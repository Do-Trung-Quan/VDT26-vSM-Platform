import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { IUserRepository } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY } from '../../users.tokens';
import { PasswordHashService } from '../../../auth/application/services/password-hash.service';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Injectable()
export class ChangePasswordHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly passwordHashService: PasswordHashService,
  ) {}

  async execute(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const isValid = await this.passwordHashService.compare(
      dto.oldPassword,
      user.passwordHash,
    );
    if (!isValid) throw new UnauthorizedException('Mật khẩu hiện tại không đúng');

    const isSame = await this.passwordHashService.compare(dto.newPassword, user.passwordHash);
    if (isSame) throw new BadRequestException('Mật khẩu mới không được trùng mật khẩu hiện tại');

    user.passwordHash = await this.passwordHashService.hash(dto.newPassword);
    await this.userRepo.save(user);
  }
}
