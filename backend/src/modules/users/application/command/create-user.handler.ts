import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY } from '../../users.tokens';
import { PasswordHashService } from '../../../auth/application/services/password-hash.service';
import { MAILER_PORT } from '../../../../shared/mailer/mailer.tokens';
import { IMailerPort } from '../../../../shared/mailer/ports/mailer.port';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserProfileDto } from '../dto/user-profile.dto';

@Injectable()
export class CreateUserHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly passwordHashService: PasswordHashService,
    @Inject(MAILER_PORT) private readonly mailer: IMailerPort,
  ) {}

  async execute(dto: CreateUserDto): Promise<UserProfileDto> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException(`Email "${dto.email}" đã được sử dụng`);

    const existingEmpId = await this.userRepo.findByEmployeeId(dto.employeeId);
    if (existingEmpId) throw new ConflictException(`Employee ID "${dto.employeeId}" đã tồn tại`);

    const rawPassword = randomBytes(5).toString('hex').toUpperCase() + randomBytes(3).toString('hex');
    const passwordHash = await this.passwordHashService.hash(rawPassword);

    const user = new User();
    user.email = dto.email;
    user.fullName = dto.fullName;
    user.employeeId = dto.employeeId;
    user.departmentId = dto.departmentId;
    user.role = dto.role;
    user.passwordHash = passwordHash;
    user.avatarUrl = '';
    user.isActive = true;

    await this.userRepo.save(user);
    await this.mailer.sendPasswordEmail(dto.email, rawPassword);

    const saved = await this.userRepo.findById(user.id);
    return toProfileDto(saved!);
  }
}

/**
 * Trích xuất MinIO object key từ giá trị avatarUrl được lưu trong DB.
 * Hỗ trợ 2 định dạng:
 *  - Format cũ (legacy): '/mp2-bucket/avatars/...' → trả về 'avatars/...'
 *  - Format mới: 'avatars/...' → trả về nguyên gốc
 */
export function extractStorageKey(avatarUrl: string): string {
  if (!avatarUrl) return '';
  const BUCKET_PREFIX = '/mp2-bucket/';
  if (avatarUrl.startsWith(BUCKET_PREFIX)) {
    return avatarUrl.slice(BUCKET_PREFIX.length);
  }
  return avatarUrl;
}

/**
 * Map User entity → UserProfileDto.
 * @param signedAvatarUrl URL đã ký (pre-signed) từ MinIO; nếu không truyền thì dùng avatarUrl gốc.
 */
export function toProfileDto(user: User, signedAvatarUrl?: string): UserProfileDto {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    employeeId: user.employeeId,
    departmentId: user.departmentId,
    departmentName: user.department?.name ?? '',
    role: user.role,
    isActive: user.isActive,
    avatarUrl: signedAvatarUrl ?? user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}
