import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User } from '../../modules/users/domain/entities/user.entity';
import { Department } from '../../modules/departments/domain/entities/department.entity';

/**
 * Seed tài khoản Admin gốc đầu tiên — không có luồng Register tự do cho hệ thống.
 * Chạy: ts-node src/database/seeds/seed-admin.ts
 */
async function seedAdmin() {
  await dataSource.initialize();

  const departmentRepo = dataSource.getRepository(Department);
  const userRepo = dataSource.getRepository(User);

  let rootDepartment = await departmentRepo.findOne({ where: { name: 'Ban Giám đốc' } });
  if (!rootDepartment) {
    rootDepartment = await departmentRepo.save(
      departmentRepo.create({
        name: 'Ban Giám đốc',
        address: 'Hội sở chính',
      }),
    );
  }

  const existingAdmin = await userRepo.findOne({ where: { email: 'admin@vsm.local' } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    await userRepo.save(
      userRepo.create({
        email: 'admin@vsm.local',
        passwordHash,
        fullName: 'System Administrator',
        employeeId: 'ADMIN-000',
        avatarUrl: '',
        role: 'ADMIN',
        departmentId: rootDepartment.id,
        isActive: true,
      }),
    );
    console.log('Seeded root admin: admin@vsm.local / Admin@123');
  } else {
    console.log('Root admin already exists, skip seeding.');
  }

  await dataSource.destroy();
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
