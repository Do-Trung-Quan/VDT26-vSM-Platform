import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { extname } from 'path';
import { IUserRepository } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY } from '../../users.tokens';
import { OBJECT_STORAGE_PORT } from '../../../../shared/object-storage/object-storage.tokens';
import { IObjectStoragePort } from '../../../../shared/object-storage/ports/object-storage.port';

@Injectable()
export class UpdateAvatarHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: IObjectStoragePort,
  ) {}

  async execute(userId: string, file: Express.Multer.File): Promise<{ avatarUrl: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const ext = extname(file.originalname) || '.jpg';
    const key = `avatars/${userId}-${Date.now()}${ext}`;

    // Upload file lên MinIO; lưu key (không lưu full URL) để backend có thể ký bất kỳ lúc nào
    await this.objectStorage.upload(file.buffer, key, file.mimetype);

    user.avatarUrl = key;
    await this.userRepo.save(user);

    // Trả về pre-signed URL để frontend render ngay lập tức
    const signedUrl = await this.objectStorage.getSignedUrl(key);
    return { avatarUrl: signedUrl };
  }
}
