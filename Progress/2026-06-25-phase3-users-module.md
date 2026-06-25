# Giai đoạn 3 — Module Users: HOÀN THÀNH

**Ngày:** 2026-06-25
**Trạng thái:** ✅ Tất cả task hoàn tất

---

## Những gì đã làm

### Infrastructure
| File | Vai trò |
|---|---|
| `users/users.tokens.ts` | `USER_REPOSITORY` DI token |
| `domain/ports/user.repository.port.ts` | `IUserRepository` — 6 method + `ListUsersOptions` / `PaginatedUsers` type |
| `infrastructure/repositories/user.repository.ts` | Impl TypeORM — dùng **QueryBuilder với raw column name** cho filter/count để tránh FK ambiguity |

### Application — DTOs
| DTO | Fields |
|---|---|
| `CreateUserDto` | email, fullName, employeeId, departmentId, role |
| `UpdateUserDto` | role?, departmentId? (chặn sửa email/employeeId) |
| `SetUserStatusDto` | isActive: boolean |
| `ChangePasswordDto` | oldPassword, newPassword |
| `ListUsersQueryDto` | extends PaginationQueryDto + keyword?, departmentId?, isActive? |
| `UserProfileDto` | id, fullName, email, employeeId, departmentId, **departmentName**, role, isActive, avatarUrl, createdAt |
| `UserListItemDto` | giống UserProfileDto |

### Application — Handlers
- **`CreateUserHandler`** — check trùng email/employeeId (409), sinh mật khẩu ngẫu nhiên (`randomBytes`), hash, lưu, gửi mail. Export helper `toProfileDto()` dùng chung.
- **`UpdateUserHandler`** — update role/departmentId, tải lại sau save để trả `departmentName` chính xác
- **`SetUserStatusHandler`** — deactivate → `user.deactivate()` + `REFRESH_TOKEN_REPOSITORY.revokeAllByUserId()` (import từ AuthModule)
- **`ChangePasswordHandler`** — verify `oldPassword` trước khi hash mật khẩu mới
- **`UpdateAvatarHandler`** — upload file buffer lên MinIO, cập nhật `avatarUrl`
- **`GetMyProfileHandler`** — lấy profile theo user.id từ JWT
- **`ListUsersHandler`** — paginated list với departmentName từ LEFT JOIN

### Presentation — Controllers
- **`MeController`** (`/api/users/me`) — `GET`, `PATCH password`, `PATCH avatar` (Multer FileInterceptor)
- **`AdminUsersController`** (`/api/admin/users`) — `GET list`, `POST create`, `PATCH :id`, `PATCH :id/status`

---

## Quyết định kỹ thuật

### 1. Import AuthModule → lấy PasswordHashService + REFRESH_TOKEN_REPOSITORY
Không tạo lại `PasswordHashService` trong users. `AuthModule` export sẵn — import trực tiếp. `REFRESH_TOKEN_REPOSITORY` cần khi deactivate user để thu hồi token trên mọi thiết bị.

### 2. QueryBuilder với raw column name trong UserRepository
Áp dụng ngay bài học từ Phase 2: tất cả filter/count bằng FK column (`department_id`, `is_active`) dùng raw SQL trong QB để tránh TypeORM FK ambiguity:
```typescript
.where('u.department_id = :departmentId', { departmentId })
.andWhere('u.is_active = :isActive', { isActive })
```

### 3. departmentName trong response — tương thích frontend
`listPaginated` dùng `leftJoinAndSelect('u.department', 'dept')` → load sẵn department object. Handler map `u.department?.name` vào `departmentName`. Frontend (`lib/types.ts`) dùng `dept: string` → map 1-1.

### 4. Multer — memory storage
File avatar lưu vào RAM buffer (`memoryStorage()`), upload trực tiếp lên MinIO. Không ghi disk tạm.

### 5. MailerModule — sync SMTP (không async queue)
`CreateUserHandler` gọi `MAILER_PORT → SmtpMailerAdapter` trực tiếp (không qua BullMQ). Lý do: user creation là admin action hiếm, không cần async. Queue chỉ dùng cho OTP (Volume cao hơn).

### 6. countActiveByDepartmentId — export USER_REPOSITORY
`UsersModule` export `USER_REPOSITORY` để **Phase 4 (DepartmentsModule)** inject vào `DeleteDepartmentHandler` kiểm tra còn nhân sự trước khi xóa mềm. Đây là điểm kết nối then chốt giữa 2 module.

---

## Mapping frontend ↔ backend

| Frontend `lib/types.ts` | Backend response field | Ghi chú |
|---|---|---|
| `name` | `fullName` | Map khi integrate |
| `empId` | `employeeId` | Map khi integrate |
| `dept` | `departmentName` | Đã JOIN sẵn trong response |
| `active` | `isActive` | Map khi integrate |
| `created` | `createdAt` (ISO string) | Frontend format `DD/MM/YYYY` |
| `color` | ❌ không có | Frontend tự generate từ initials |

---

## Cách kiểm tra (manual test với Postman)

Server: `npm run start:dev`, base URL: `http://localhost:3001/api`

### Admin — quản lý nhân sự (cần ADMIN token từ Phase 2 login)

**GET /admin/users** (phân trang + filter)
```
GET /api/admin/users?page=1&limit=10
GET /api/admin/users?keyword=admin
GET /api/admin/users?isActive=true
```
→ `{ data: [...], meta: { total, page, limit, totalPages } }`

**POST /admin/users** (tạo tài khoản, gửi mail mật khẩu)
```json
{ "email": "test@viettel.com", "fullName": "Nhân viên Test",
  "employeeId": "VT-99999", "departmentId": "<uuid ban giám đốc>", "role": "USER" }
```
→ 201, check Mailtrap inbox nhận email có mật khẩu.
→ Gửi lần 2 với email trùng → 409 Conflict

**PATCH /admin/users/:id** (sửa role/department)
```json
{ "role": "ADMIN" }
```
→ 200, user profile updated

**PATCH /admin/users/:id/status** (toggle active)
```json
{ "isActive": false }
```
→ 200, kiểm tra DB: `is_active = false`, bảng `refresh_tokens`: `is_revoked = true`

### Self-service — tài khoản cá nhân

**GET /users/me** (profile)
→ 200, thông tin đầy đủ kèm `departmentName`

**PATCH /users/me/password** (đổi mật khẩu)
```json
{ "oldPassword": "Admin@123", "newPassword": "NewPass456" }
```
→ 200 nếu đúng, 401 nếu sai mật khẩu cũ

**PATCH /users/me/avatar** (upload ảnh)
```
Content-Type: multipart/form-data
Body: form-data, field "file" = ảnh JPG/PNG
```
→ 200, `{ data: { avatarUrl: "/mp2-bucket/avatars/..." } }`, check MinIO Console

---

## Trạng thái codebase sau Giai đoạn 3

```
✅ Module auth     — fully implemented
✅ Module users    — fully implemented
⏳ Module departments — skeleton (Phase 4 — cần USER_REPOSITORY từ UsersModule)
⏳ Module meetings    — skeleton (Phase 5-7)
⏳ Module notifications — skeleton (Phase 8)
⏳ Module dashboard   — skeleton (Phase 9)
```

**Bước tiếp theo:** Giai đoạn 4 — Module `departments` (import UsersModule để check nhân sự trước khi xóa phòng ban).
