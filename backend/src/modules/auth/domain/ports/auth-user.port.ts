import { User } from '../../../users/domain/entities/user.entity';

export interface IAuthUserPort {
  findActiveByEmail(email: string): Promise<User | null>;
  findActiveById(id: string): Promise<User | null>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
}
