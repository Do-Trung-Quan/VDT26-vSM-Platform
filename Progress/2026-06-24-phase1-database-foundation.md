# Giai đoạn 1 — Database Foundation: HOÀN THÀNH

**Ngày:** 2026-06-24
**Trạng thái:** ✅ Tất cả task hoàn tất

---

## Những gì đã làm

### Task 1.1 — Implement 8 Domain Entity

**File mới / cập nhật:**

| File | Nội dung |
|---|---|
| `src/database/strategies/snake-naming.strategy.ts` | `SnakeCaseNamingStrategy` — tự động convert camelCase property → snake_case column DB (`passwordHash` → `password_hash`...) |
| `src/database/database.module.ts` | Thêm `namingStrategy: new SnakeCaseNamingStrategy()` vào TypeORM config |
| `src/database/data-source.ts` | Thêm `namingStrategy` cho TypeORM CLI (migration generate/run) |
| `src/modules/departments/domain/entities/department.entity.ts` | Entity đầy đủ: 7 cột, method `softDelete()` / `restore()` / `isActive()` |
| `src/modules/users/domain/entities/user.entity.ts` | Entity đầy đủ: 12 cột, enum `UserRole`, method `isAdmin()` / `canSeeMeetingOf()` / `deactivate()` / `activate()` |
| `src/modules/auth/domain/entities/refresh-token.entity.ts` | Entity đầy đủ: 6 cột, method `revoke()` / `isExpired()` / `isValid()` |
| `src/modules/auth/domain/entities/password-reset-otp.entity.ts` | Entity đầy đủ: 6 cột, class `PasswordResetOtp`, method `markUsed()` / `isValid(now)` |
| `src/modules/meetings/domain/entities/meeting.entity.ts` | Entity đầy đủ + extends `AggregateRootBase`: 16 cột, 2 enum (`MeetingType`, `MeetingStatus`), method `startLive()` / `markProcessing()` / `complete()` / `lock()` / `softDelete()`... |
| `src/modules/meetings/domain/entities/transcript-block.entity.ts` | Entity đầy đủ: 8 cột, method `renameSpeaker()` |
| `src/modules/meetings/domain/entities/meeting-summary.entity.ts` | Entity đầy đủ: 6 cột, enum `MeetingSummaryStatus`, method `markCompleted(text)` |
| `src/modules/notifications/domain/entities/notification.entity.ts` | Entity đầy đủ: 7 cột, enum `NotificationType`, method `markRead()` + static factory `Notification.create(...)` |
| `src/modules/*/` (6 files) | Cập nhật từ comment → `@Module` thật với `TypeOrmModule.forFeature([...])` để app compile và autoLoadEntities hoạt động |
| `src/database/seeds/seed-admin.ts` | Cập nhật dùng `UserRole.ADMIN` thay vì string `'ADMIN'` |

**Quyết định kỹ thuật quan trọng:**
- `SnakeCaseNamingStrategy` giúp viết entity hoàn toàn camelCase mà không cần `@Column({ name: 'snake_case' })` thủ công trên từng cột — TypeORM tự convert khi tạo migration.
- Entity dùng pattern **FK column + @ManyToOne relation** cùng lúc: `departmentId: string` (@Column) + `department: Department` (@ManyToOne) để vừa có FK value trực tiếp vừa có thể load relation sau.
- `Meeting` kế thừa `AggregateRootBase` để tích hợp domain event pattern cho Phase 8 (notifications).

---

### Task 1.2 — Sinh migration & Seed Admin

**Lệnh đã chạy:**
```bash
# Sinh migration từ 8 entity
npm run migration:generate -- src/database/migrations/InitSchema
# → Tạo file: src/database/migrations/1782280846265-InitSchema.ts

# Áp dụng migration
npm run migration:run
# → 8 bảng + 5 ENUM types + 9 FK constraints created

# Seed Admin
npx ts-node -r tsconfig-paths/register src/database/seeds/seed-admin.ts
# → Created department: Ban Giám đốc
# → ✓ Seeded root admin: admin@vsm.local / Admin@123
```

**Vấn đề đã gặp và cách giải quyết:**
- PostgreSQL host `5432` bị trùng với PostgreSQL đã cài sẵn trên Windows → Bạn đổi sang cổng `5433` trong `docker-compose.yml` và cập nhật `DB_PORT=5433` trong `.env`.

---

## Cách kiểm tra kết quả (manual test với pgAdmin)

### Kiểm tra 8 bảng đã tạo

Mở **pgAdmin** → kết nối với:
- Host: `localhost`
- Port: `5433`
- Username: `postgres`
- Password: `postgres`
- Database: `mp2`

Vào **Databases → mp2 → Schemas → public → Tables**, phải thấy đủ 8 bảng:

| Bảng | Cột đặc trưng cần kiểm tra |
|---|---|
| `departments` | `deleted_at` nullable, `name` UNIQUE |
| `users` | `role` enum, `department_id` FK, `is_active` default true |
| `refresh_tokens` | `token_hash`, `is_revoked` default false |
| `password_reset_otps` | `otp_code`, `is_used` default false |
| `meetings` | `type` enum, `status` enum, `deleted_at` nullable, `host_id` + `department_id` FK |
| `transcript_blocks` | `sequence_number`, `start_time` float, `end_time` float |
| `meeting_summaries` | `meeting_id` UNIQUE, `status` enum, FK 1-1 với meetings |
| `notifications` | `type` enum, `is_read` default false |

### Kiểm tra ENUM types
Vào **Databases → mp2 → Schemas → public → Types**, phải thấy 5 enum:
- `users_role_enum` (USER, ADMIN)
- `meetings_type_enum` (LIVE, UPLOAD)
- `meetings_status_enum` (LIVE, PROCESSING, COMPLETED)
- `meeting_summaries_status_enum` (PROCESSING, COMPLETED)
- `notifications_type_enum` (MEETING_CREATED, MEETING_STATUS_CHANGED, MEETING_INFO_UPDATED)

### Kiểm tra tài khoản Admin đã seed

Trong pgAdmin, chạy query:
```sql
SELECT u.id, u.email, u.full_name, u.role, u.is_active, d.name as department
FROM users u
JOIN departments d ON u.department_id = d.id;
```

Kết quả mong đợi:
```
id       | email              | full_name            | role  | is_active | department
---------|--------------------| ---------------------|-------|-----------|-------------
<uuid>   | admin@vsm.local    | System Administrator | ADMIN | true      | Ban Giám đốc
```

### Kiểm tra migration đã ghi nhận
```sql
SELECT * FROM migrations;
```
→ Thấy 1 dòng: `InitSchema1782280846265`

---

## Trạng thái codebase sau Giai đoạn 1

```
✅ 8 entity files — implemented (TypeORM decorators + business methods)
✅ 8 bảng PostgreSQL — created via migration
✅ 1 admin account — seeded
✅ 6 module files — valid NestJS @Module (app có thể compile)
⏳ 6 module logic — still skeleton (Phase 2-9 sẽ implement từng phần)
```

**Bước tiếp theo:** Giai đoạn 2 — Module `auth` (JWT login, refresh token, OTP reset password).
