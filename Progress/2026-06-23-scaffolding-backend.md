# Tóm tắt: Dựng khung xương (Scaffolding) Backend MP2

**Ngày thực hiện:** 2026-06-23
**Phạm vi:** `backend/` — toàn bộ cây thư mục NestJS theo đúng `.context/PROJECT_STRUCTURE.md`.

---

## 1. Đã làm

### 1.1. Root project (`backend/`) — có nội dung thực thi đầy đủ
- `package.json` (scripts build/start/lint/test/migration theo CLAUDE.md §2), `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`
- `.env.example`, `.gitignore`, `.eslintrc.js`, `.prettierrc`
- `Dockerfile` (multi-stage build), `docker-compose.yml` (backend, postgres, redis, minio, nginx)

### 1.2. Hạ tầng nền tảng (`src/`) — code thật, đã wiring DI
- `main.ts`, `app.module.ts` (import đủ 6 module nghiệp vụ + Config/Database/Queue/Shared, đăng ký guard/filter/interceptor toàn cục)
- `config/` — 7 file `registerAs` config (app, database, redis, jwt, storage, ai, transcription) + `env.validation.ts` (Joi) + `config.module.ts`
- `database/` — `database.module.ts` (TypeOrmModule.forRootAsync, autoLoadEntities), `data-source.ts` (CLI), `migrations/` (rỗng, sẵn sàng generate), `seeds/seed-admin.ts`
- `queue/` — `queue.module.ts` (BullMQ root + 3 queue), `queue.constants.ts`, `README.md`
- `common/` — guards (`jwt-auth`, `roles`, `department-scope`), decorators (`@Public`, `@Roles`, `@CurrentUser`), `pipes/parse-uuid-or-400`, `filters/all-exceptions`, `interceptors` (transform-response, logging), `dto` (pagination), `domain` (DomainEventBase, AggregateRootBase)
- `shared/` — `event-bus` (port + BullMQ adapter), `object-storage` (port + MinIO adapter), `mailer` (port + SMTP adapter), `redis` (provider)

### 1.3. Sáu module nghiệp vụ (`src/modules/*`) — CHỈ khung xương
Theo yêu cầu: **mỗi file chỉ là 1 dòng comment mô tả vai trò** (lấy từ chú thích trong PROJECT_STRUCTURE.md), **không viết code/logic bên trong**. Đã tạo đủ folder + file cho cả 4 lớp DDD (`presentation/application/domain/infrastructure`) của:

| Module | Số file đã scaffold |
| --- | --- |
| `auth/` | 20 |
| `users/` | 20 |
| `departments/` | 14 |
| `meetings/` | 70 (module lớn nhất — đủ REST, WS gateway, streaming services, BullMQ workers, listeners) |
| `notifications/` | 12 |
| `dashboard/` | 13 |

Tổng cộng **~149 file** trong `src/`, khớp 100% tên file/đường dẫn với cây thư mục trong `.context/PROJECT_STRUCTURE.md`.

### 1.4. `test/`
- `jest-e2e.json` (config thật, để `npm run test:e2e` chạy được)
- `app.e2e-spec.ts` (skeleton — chỉ comment)

---

## 2. Lưu ý quan trọng cho người tiếp theo (Agent hoặc Dev)

- **Toàn bộ logic nghiệp vụ trong 6 module CHƯA được viết** — các file `.entity.ts`, `.handler.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `.adapter.ts`, `.port.ts`, `.dto.ts`, `.gateway.ts`, `.processor.ts`, `.listener.ts`, `.event.ts` trong `src/modules/` hiện chỉ chứa 1 dòng comment — **không compile được** cho tới khi implement.
- Các import xuyên-module đã được "đặt trước" ở lớp hạ tầng (ví dụ `common/guards/roles.guard.ts` import `UserRole` từ `modules/users/domain/entities/user.entity.ts`) — sẽ cần khớp lại tên export khi implement entity thật.
- Thứ tự khuyến nghị khi triển khai logic: `departments` → `users` → `auth` → `meetings` → `notifications` → `dashboard` (theo phụ thuộc FK/Port).
- Quy tắc bắt buộc khi viết code thật vào các file này: tuân thủ CLAUDE.md — gộp Domain Entity + ORM Entity (không tạo `*.orm-entity.ts`/`*.mapper.ts`), chỉ Soft Delete, DepartmentScopeGuard, Admin kế thừa quyền User.
- Sau khi viết entity thật → bắt buộc `npm run migration:generate` (chưa có migration nào được tạo, `migrations/` đang rỗng).
