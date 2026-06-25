# Giai đoạn 2 — Module Auth: HOÀN THÀNH

**Ngày:** 2026-06-25
**Trạng thái:** ✅ Tất cả task hoàn tất + 4 cải tiến + 1 bugfix timezone

---

## Những gì đã làm

### Task 2.1 — Ports → Infrastructure → Services

| File | Vai trò |
|---|---|
| `auth/auth.tokens.ts` | 3 DI token symbols: REFRESH_TOKEN_REPOSITORY, PASSWORD_RESET_OTP_REPOSITORY, AUTH_USER_PORT |
| `domain/ports/auth-user.port.ts` | `IAuthUserPort`: findActiveByEmail, findActiveById, updatePasswordHash |
| `domain/ports/refresh-token.repository.port.ts` | `IRefreshTokenRepository`: save, findByHash, revokeAllByUserId |
| `domain/ports/password-reset-otp.repository.port.ts` | `IPasswordResetOtpRepository`: save, findActiveByUserId, markAllUsedByUserId |
| `infrastructure/repositories/refresh-token.repository.ts` | Impl TypeORM — lưu/tra cứu RefreshToken theo hash SHA256 |
| `infrastructure/repositories/password-reset-otp.repository.ts` | Impl TypeORM — lấy OTP active (chưa dùng, chưa hết hạn, mới nhất) |
| `infrastructure/adapters/auth-user.adapter.ts` | Đọc/ghi User qua TypeORM — dùng nội bộ auth, không phụ thuộc UsersModule |
| `infrastructure/adapters/async-mailer.adapter.ts` | **MỚI** — enqueue BullMQ thay vì gửi SMTP trực tiếp |
| `infrastructure/processors/mail.processor.ts` | **MỚI** — BullMQ Worker xử lý nền, gọi SmtpMailerAdapter thực sự |
| `infrastructure/strategies/jwt.strategy.ts` | Passport JWT strategy 'jwt' — extract Bearer token, trả `CurrentUserPayload` |
| `application/services/token.service.ts` | `signAccessToken` / `verifyAccessToken` dùng `@nestjs/jwt` |
| `application/services/password-hash.service.ts` | `hash` / `compare` dùng bcrypt (10 rounds) |

### Task 2.2 — DTOs + Command Handlers + Controller + Module

**5 DTOs:** `LoginDto`, `RefreshTokenDto`, `ForgotPasswordDto`, `ResetPasswordDto`, `AuthResponseDto`

**5 Command Handlers:**
- `LoginHandler` — verify email+password (bcrypt), issue access_token + lưu refresh_token (SHA256 hash)
- `RefreshTokenHandler` — validate + rotate refresh_token (revoke old, issue new), lấy lại user info cho payload
- `LogoutHandler` — revoke refresh_token theo hash
- `ForgotPasswordHandler` — OTP cooldown check + tạo OTP + enqueue mail job (async)
- `ResetPasswordHandler` — verify OTP, update password_hash, revoke all refresh tokens

**AuthController:** 5 route, tất cả `@Public()` vì auth routes không yêu cầu JWT:
- POST `/api/auth/login` → 200
- POST `/api/auth/refresh` → 200
- POST `/api/auth/logout` → 200
- POST `/api/auth/forgot-password` → 200
- POST `/api/auth/reset-password` → 200

**AuthModule:** wires đủ DI, export `PasswordHashService` và `REFRESH_TOKEN_REPOSITORY` (cần cho Phase 3).

---

## 4 Cải tiến đã áp dụng

### 1. Standard API Envelope
Mọi response đều theo format:
```json
{
  "statusCode": number,
  "message": string,
  "data": any | null,
  "meta": any | null
}
```
- **Success GET (entity):** `data = entity`, `meta = null`
- **Success GET (paginated):** `data = items[]`, `meta = { total, page, limit, totalPages }`
- **Command message-only:** `message = "..."`, `data = null`
- **Lỗi:** `data = null`, `message = chi tiết lỗi`, `statusCode = 4xx/5xx`

### 2. Remove Hardcoded Values
3 env vars mới được thêm vào `.env`, `.env.example`, `env.validation.ts`:
- `JWT_REFRESH_TTL_MS=604800000` — TTL refresh token (7 ngày tính ms)
- `OTP_TTL_MINUTES=10` — thời hạn OTP
- `OTP_COOLDOWN_SECONDS=60` — cooldown giữa 2 lần gửi OTP

### 3. OTP Rate Limiting (Cooldown)
Trong `ForgotPasswordHandler`: trước khi tạo OTP mới, kiểm tra OTP đang active → nếu `createdAt` trong vòng `OTP_COOLDOWN_SECONDS` giây → `BadRequestException 400`: `"Vui lòng đợi X giây trước khi yêu cầu mã OTP mới"`. Dùng DB check (không cần Redis riêng vì rate limit per-user).

### 4. Async Email via BullMQ
- `MAILER_PORT` trong AuthModule được override → `AsyncMailerAdapter` (enqueue BullMQ job vào queue `mail-otp`)
- `MailProcessor` (Worker) lắng nghe queue `mail-otp`, gọi `SmtpMailerAdapter` ở nền
- Handler `ForgotPasswordHandler` trả response **ngay lập tức** sau khi enqueue, không đợi SMTP

---

## Cách kiểm tra (manual test với Postman)

**Khởi động server:** `cd backend && npm run start:dev` → chờ `Application is running on port 3001`

### Test 1 — Login
```
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{ "email": "admin@vsm.local", "password": "Admin@123" }
```
→ 200, envelope `{ statusCode: 200, message: "Success", data: { accessToken, refreshToken, user: {...} }, meta: null }`

### Test 2 — Refresh token
```
POST http://localhost:3001/api/auth/refresh
{ "refreshToken": "<từ Test 1>" }
```
→ 200, access_token mới + refresh_token mới. Refresh_token cũ bị revoke.

### Test 3 — Logout
```
POST http://localhost:3001/api/auth/logout
{ "refreshToken": "<từ Test 1 hoặc 2>" }
```
→ 200, `{ statusCode: 200, message: "Đăng xuất thành công", data: null, meta: null }`

### Test 4 — Forgot Password (với Mailtrap)
```
POST http://localhost:3001/api/auth/forgot-password
{ "email": "admin@vsm.local" }
```
→ 200 trả **ngay lập tức** (không đợi SMTP). Mở Mailtrap inbox → nhận email OTP sau ~1-2 giây.

**Test cooldown:** Gửi lần 2 trong vòng 60s → `400 Bad Request: "Vui lòng đợi X giây..."`

### Test 5 — Reset Password
```
POST http://localhost:3001/api/auth/reset-password
{ "email": "admin@vsm.local", "otpCode": "<từ Mailtrap>", "newPassword": "NewAdmin@123" }
```
→ 200. Login lại với `NewAdmin@123` → thành công.

### Test 6 — Bảo mật (nên kiểm tra)
- Login với sai password → `401 Unauthorized`
- Gọi protected route (ví dụ `GET /api/users/me` sau Phase 3) mà không có Bearer token → `401`
- OTP sai → `400 Bad Request`
- Reset password với OTP đã dùng → `400 Bad Request`

---

## Quyết định kiến trúc đáng chú ý

- **`IAuthUserPort`**: auth module có port riêng để read/write User (không dùng IUserRepository của UsersModule chưa sẵn sàng). Sau Phase 3, có thể thống nhất nếu muốn.
- **`AsyncMailerAdapter` override `MAILER_PORT` cục bộ**: AuthModule không import MailerModule; thay vào đó tự provide SmtpMailerAdapter (cho processor) và AsyncMailerAdapter (cho handlers). Mẫu này có thể tái dùng khi UsersModule cần gửi email async.
- **`PasswordHashService` + `REFRESH_TOKEN_REPOSITORY` được export**: Phase 3 (UsersModule) sẽ import AuthModule để dùng PasswordHashService khi tạo user; Phase 3 SetUserStatusHandler sẽ dùng REFRESH_TOKEN_REPOSITORY để revoke tokens khi deactivate user.

---

## Bugfix phát sinh sau test

### Lỗi: OTP Cooldown không hoạt động (secondsSinceCreated luôn > 25200)

**Nguyên nhân:** PostgreSQL lưu `TIMESTAMP WITHOUT TIME ZONE`. Khi `pg` driver đọc lại giá trị `createdAt`, nó parse chuỗi timestamp dạng `"2026-06-25 08:00:00"` (không có timezone suffix) bằng JavaScript `new Date()`, vốn hiểu đây là **giờ LOCAL** (UTC+7 ở môi trường dev). Kết quả: `existingOtp.createdAt.getTime()` bị lệch -7 tiếng so với UTC, trong khi `Date.now()` luôn là UTC → hiệu số luôn ≈ 25,200 giây → `secondsSinceCreated < 60` không bao giờ đúng → cooldown bị bỏ qua.

**Fix áp dụng (`src/database/database.module.ts`):**
```typescript
import { types } from 'pg';
// OID 1114 = timestamp without time zone
types.setTypeParser(1114, (val: string) => new Date(val + 'Z'));
```
Thêm `'Z'` buộc pg parse tất cả timestamp là UTC — fix toàn cục cho mọi `@CreateDateColumn` / `@UpdateDateColumn` trong 8 entity, không cần sửa từng handler.

Cũng cài thêm `@types/pg` vào devDependencies để TypeScript không báo lỗi khi import `{ types } from 'pg'`.

**Hướng đi sai đã loại trừ:** Ban đầu nghi ngờ TypeORM `find`/`update` API không resolve đúng FK column (`userId` → `user_id`) khi có cả `@Column()` và `@ManyToOne` cùng trỏ vào một cột. Đã thử chuyển sang QueryBuilder với raw SQL column name nhưng không giải quyết được vấn đề. Sau khi xác nhận nguyên nhân thực là timezone, đã revert lại implementation `find`/`update` API gốc (sạch hơn, không cần QueryBuilder).

---

## Trạng thái codebase sau Giai đoạn 2

```
✅ Module auth — fully implemented
✅ API Envelope — chuẩn hoá toàn bộ response/error format
✅ BullMQ mail queue — hoạt động (mail-otp)
⏳ Module users — skeleton (Phase 3)
⏳ Module departments — skeleton (Phase 4)
```

**Bước tiếp theo:** Giai đoạn 3 — Module `users` (quản lý nhân sự, import AuthModule).
