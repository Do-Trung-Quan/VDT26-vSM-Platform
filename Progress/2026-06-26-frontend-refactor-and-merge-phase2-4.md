# Frontend Refactor & Merge (Giai đoạn 2–4): HOÀN THÀNH

**Ngày:** 2026-06-25 → 2026-06-26
**Phạm vi:** Toàn bộ giao diện frontend + kết nối API thật thay thế mock data cho Auth / Users / Departments

---

## I. UI/UX Refactor (Frontend-only, không liên quan backend)

### 1. Trang Đăng nhập (`login/page.tsx`)
- **Split screen 50/50**: Khung trái nền tối `bg-slate-950` với NeuralWaveform SVG animated, khung phải nền trắng với form
- **NeuralWaveform component** (`components/neural-waveform.tsx`): 64 thanh SVG animated bằng CSS keyframes, dot grid overlay, ambient glow — không dùng video/mp4 tránh lỗi CORS
- **Brand block**: Logo vuông `bg-red-600` chứa icon `Volume2`, text `"vSM — vSpeechMind"` màu đỏ, sub-text trắng
- **Input với icon**: `User` icon cho email, `Lock` icon cho password
- **Eye/EyeOff toggle**: Ẩn/hiện mật khẩu
- **Nút submit**: Màu đỏ Viettel, loading spinner, Enter key handler

### 2. Trang Quên mật khẩu (`reset-password/page.tsx`)
- **Full-screen NeuralWaveform** + glassmorphism overlay nhẹ (`backdrop-blur-[4px] bg-slate-950/20`) để waveform hiện rõ
- **Stepper 3 bước** với connector line + checkmark khi done, màu đỏ Viettel cho step active
- **Step 1 (Email)**: Mail icon trong input
- **Step 2 (OTP)**: 6 ô input auto-focus khi gõ, xử lý paste, countdown timer đổi màu khi hết giờ
- **Step 3 (Mật khẩu mới)**: Eye/EyeOff cho cả 2 trường, validation realtime khi nhập không khớp

### 3. Màn hình Admin Users (`(shell)/users/page.tsx`)
- **Dropdown 3 chấm** (`MoreVertical`) thay thế Switch trực tiếp: menu gồm "Chỉnh sửa" (Pencil) và "Kích hoạt/Vô hiệu hóa" (UserCheck/UserX)
- **Edit User Dialog**: Fields cố định readonly (email, name, empId), fields có thể sửa (dept Select, role RadioGroup), style tái dụng từ Add Dialog
- **Dialog không tự đóng**: Thêm `onPointerDownOutside` + `onInteractOutside` preventDefault — tránh đóng dialog khi click Select dropdown
- **Table header đậm**: `font-bold text-tx-dark uppercase tracking-wide bg-surface/60`
- **Avatar image**: Nếu có `avatarUrl` → `<img>`, ngược lại → vòng tròn initials

### 4. Màn hình Admin Departments (`(shell)/departments/page.tsx`)
- **Bộ lọc mặc định "active"** (thay vì "all")
- **Opacity chỉ trên cell nội dung**: Hàng đã xóa chỉ fade text cells, cell hành động giữ `opacity-100` để nút Khôi phục hiện rõ
- **Phân trang server-side**: Giống Users, thêm `page/total/totalPages` state, UI phân trang dưới bảng
- **Dialog không tự đóng**: Thêm preventDefault tương tự Users

### 5. Màn hình Cá nhân (`(shell)/personal/page.tsx`)
- **Eye/EyeOff 3 trường**: Mật khẩu hiện tại, mới, xác nhận — dùng component `PwToggle` nội bộ
- **Disable nút khi form chưa hợp lệ**: Trống hoặc mật khẩu mới ≠ xác nhận
- **Xử lý 401 tiếng Việt**: Bẫy 401 → "Mật khẩu hiện tại không chính xác", không redirect sang login
- **Avatar**: Hiển thị `<img>` nếu có `avatarUrl`, ngược lại initials + màu động
- **Realtime header update**: Sau upload avatar, gọi `refreshUser()` → Header cập nhật ngay không cần F5

---

## II. Frontend–Backend Merge (Phases 2–4)

### Kiến trúc kết nối

| File | Vai trò |
|---|---|
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:3001` |
| `frontend/next.config.ts` | Rewrite `/api/*` → backend `:3001/api/*`, `/mp2-bucket/*` → MinIO `:9000` |
| `frontend/lib/api.ts` | Base `fetch` wrapper: tự gắn JWT, parse envelope `{data, meta}`, xử lý 401 |
| `frontend/lib/api/auth.ts` | `authApi`: login, refresh, logout, forgotPassword, resetPassword |
| `frontend/lib/api/users.ts` | `usersApi`: list (items←data, phân trang←meta), create, update, setStatus, getProfile, changePassword, updateAvatar |
| `frontend/lib/api/departments.ts` | `departmentsApi`: list, create, update, softDelete, restore |
| `frontend/lib/auth-context.tsx` | `AuthProvider`: lưu `AuthUser` vào localStorage, `User` đầy đủ trong memory (qua `getProfile()`), cung cấp `refreshUser()` |
| `frontend/middleware.ts` | Kiểm tra cookie `access_token`, redirect về `/login` nếu chưa đăng nhập |
| `frontend/lib/types.ts` | Sync hoàn toàn với backend DTO: `fullName`, `employeeId`, `isActive`, `createdAt` (ISO); thêm helpers `getAvatarColor`, `getInitials`, `formatDate` |

### Các trang đã kết nối API thật

| Trang | API gọi | Ghi chú |
|---|---|---|
| `login` | `POST /auth/login` | Lưu tokens, gọi `getProfile()`, redirect `/meetings` |
| `reset-password` | `POST /auth/forgot-password` + `POST /auth/reset-password` | OTP cooldown hiển thị đúng |
| `admin/users` | `GET /admin/users` (phân trang+filter) · `POST` · `PATCH :id` · `PATCH :id/status` | Loading state, error inline |
| `admin/departments` | `GET /admin/departments` · `POST` · `PATCH :id` · `DELETE :id` · `POST :id/restore` | Server-side filter+pagination |
| `personal` | `GET /users/me` · `PATCH /users/me/password` · `PATCH /users/me/avatar` | |
| `header` | Đọc từ `profile` (User) trong AuthContext | Avatar image/initials, tên thật, logout |
| `sidebar` | Đọc `user.role` từ AuthContext | Ẩn/hiện menu ADMIN |

---

## III. Bug Fixes sau Merge

### BF-1: `data.items undefined` crash Users/Departments
- **Nguyên nhân**: `TransformResponseInterceptor` tách paginated response: `items[]` → `data`, `{total,...}` → `meta`. Code trang gọi `data.items` sai.
- **Fix**: Sửa generic type `api.get<User[]>` thay `api.get<PaginatedUsersData>`, dùng `data` trực tiếp, lấy `total` từ `meta`.

### BF-2: 401 reload trang Login khi đăng nhập sai mật khẩu
- **Nguyên nhân**: `apiFetch` bắt 401 và `window.location.replace("/login")` mọi lúc, kể cả khi đang ở `/login`.
- **Fix**: Kiểm tra `window.location.pathname` trước khi redirect. Không redirect nếu đang ở `/login`, `/reset-password`, hoặc đang gọi `/users/me/password`.

### BF-3: Thông báo lỗi validation tiếng Anh
- **Nguyên nhân**: class-validator mặc định trả message tiếng Anh.
- **Fix**: Thêm `message: 'tiếng Việt'` vào các DTO auth (`LoginDto`, `ForgotPasswordDto`, `ResetPasswordDto`).

### BF-4: Avatar 403 Forbidden
- **Nguyên nhân**: MinIO bucket mặc định private, URL thô không có credentials.
- **Fix (backend)**: Chuyển sang **pre-signed URL**:
  - `UpdateAvatarHandler`: lưu `key` vào DB thay vì full path
  - `GetMyProfileHandler` + `ListUsersHandler`: inject `OBJECT_STORAGE_PORT`, gọi `getSignedUrl(key)` trước khi map DTO
  - Helper `extractStorageKey()` xử lý cả format cũ `/mp2-bucket/…` và format mới `avatars/…`
- **Fix (frontend)**: Thêm rewrite `/mp2-bucket/*` → MinIO trong `next.config.ts`

### BF-5: Header avatar không cập nhật sau upload
- **Nguyên nhân**: `AuthUser` trong context thiếu `avatarUrl`; avatar chỉ cập nhật local state của personal page.
- **Fix**: Thêm `profile: User | null` vào `AuthContext` — sau login và app boot gọi `getProfile()` lấy User đầy đủ vào memory (không lưu localStorage để tránh expired signed URL). Thêm `refreshUser()` — personal page gọi sau upload để Header cập nhật ngay.

---

## IV. Cấu trúc types.ts sau sync

```typescript
// Đã đổi tên khớp backend:
User.name          → User.fullName
User.empId         → User.employeeId
User.dept          → User.departmentName  (kèm departmentId)
User.active        → User.isActive
User.created       → User.createdAt       (ISO string)
User.color         → ❌ xóa (computed runtime qua getAvatarColor(id))

// Thêm mới:
getAvatarColor(id: string): string   // deterministic từ userId
getInitials(fullName: string): string
formatDate(iso: string): string      // → DD/MM/YYYY
```

---

## V. Trạng thái sau khi hoàn tất

```
✅ Frontend UI refactored (Login, ResetPwd, Users, Departments, Personal)
✅ Auth (Phase 2)  — fully connected
✅ Users (Phase 3) — fully connected (CRUD, avatar, password)
✅ Departments (Phase 4) — fully connected (CRUD, soft-delete, restore, pagination)
✅ Pre-signed URL cho avatar
✅ AuthContext dùng User đầy đủ từ getProfile() — header live update
⏳ Meetings (Phase 5) — còn dùng mock data
⏳ Notifications, Dashboard — skeleton
```
