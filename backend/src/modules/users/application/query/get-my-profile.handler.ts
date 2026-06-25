import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY } from '../../users.tokens';
import { OBJECT_STORAGE_PORT } from '../../../../shared/object-storage/object-storage.tokens';
import { IObjectStoragePort } from '../../../../shared/object-storage/ports/object-storage.port';
import { UserProfileDto } from '../dto/user-profile.dto';
import { toProfileDto, extractStorageKey } from '../command/create-user.handler';

@Injectable()
export class GetMyProfileHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: IObjectStoragePort,
  ) {}

  async execute(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const signedAvatarUrl = user.avatarUrl
      ? await this.objectStorage.getSignedUrl(extractStorageKey(user.avatarUrl))
      : '';

    return toProfileDto(user, signedAvatarUrl);
  }
}
