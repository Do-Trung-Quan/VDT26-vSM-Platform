# Roadmap Phát triển — MP2 Backend

> Lộ trình từ bộ khung xương (scaffolding đã dựng) đến sản phẩm hoàn chỉnh.
> Mỗi giai đoạn có hướng dẫn cụ thể về công cụ và cách kiểm thử kết quả.

---

## Chuẩn bị môi trường làm việc (làm 1 lần duy nhất)

Trước khi bắt đầu bất kỳ giai đoạn nào, cần:

1. **Cài đặt thư viện:**
   ```bash
   cd backend
   npm install
   ```

2. **Tạo file `.env`** từ `.env.example`, điền đúng thông tin kết nối DB/Redis/MinIO/SMTP.

3. **Khởi động hạ tầng nền (PostgreSQL, Redis, MinIO):**
   ```bash
   docker compose up postgres redis minio -d
   ```
   > Chưa cần khởi động `nginx` hay `backend` container ở giai đoạn đầu — ta sẽ chạy backend bằng `npm run start:dev` để debug dễ hơn.

4. **Công cụ cần cài:**
   - **[Thunder Client](https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client)** (extension VS Code) — gọi REST API
   - **[TablePlus](https://tableplus.com/)** hoặc **pgAdmin** — xem dữ liệu PostgreSQL
   - **[Redis Insight](https://redis.com/redis-enterprise/redis-insight/)** — xem dữ liệu Redis
   - **[Mailtrap](https://mailtrap.io/)** (free account) — bẫy email test, điền thông tin SMTP vào `.env`

---

## Giai đoạn 1 — Nền tảng dữ liệu (Database Foundation)

### Task 1.1 — Implement 8 Domain Entity

**Mục tiêu:** Viết đầy đủ nội dung 8 file `.entity.ts` với TypeORM decorators và method nghiệp vụ, khớp với schema `mp2_dbdiagram.dbml`.

Tôi sẽ làm:
- Viết `Department`, `User`, `RefreshToken`, `PasswordResetOTP`, `Meeting`, `TranscriptBlock`, `MeetingSummary`, `Notification`
- Mỗi entity có đủ cột (kiểu, nullable, unique), quan hệ FK (`@ManyToOne`...), và method nghiệp vụ (`softDelete()`, `isActive()`, `revoke()`, `markRead()`...)

**Cách kiểm thử:**
```bash
# Chạy TypeScript compiler để xem có lỗi kiểu dữ liệu không
cd backend && npm run build
```
> ✅ Kết quả mong đợi: build thành công, không có lỗi TypeScript. Chưa cần chạy server.

---

### Task 1.2 — Sinh migration & Seed Admin

**Mục tiêu:** Tạo schema 8 bảng thật trong PostgreSQL, có tài khoản Admin để đăng nhập.

Tôi sẽ làm:
- Chạy lệnh sinh migration tự động từ 8 entity
- Chạy migration để tạo bảng
- Chạy seed tạo tài khoản Admin gốc

**Cách kiểm thử:**

```bash
# Sinh migration
npm run migration:generate -- src/database/migrations/InitSchema

# Áp dụng migration lên DB
npm run migration:run

# Seed Admin
npx ts-node src/database/seeds/seed-admin.ts
```

Mở **TablePlus**, kết nối PostgreSQL (host/port/user/pass theo `.env`):
- Vào tab **Tables** → thấy đủ 8 bảng: `users`, `departments`, `refresh_tokens`, `password_reset_otps`, `meetings`, `transcript_blocks`, `meeting_summaries`, `notifications`
- Vào bảng `users` → có 1 dòng Admin (`email: admin@vsm.local`)
- Vào bảng `departments` → có 1 phòng ban "Ban Giám đốc"

> ✅ Kết quả mong đợi: 8 bảng tồn tại với đúng cột, có 1 user Admin.

---

## Giai đoạn 2 — Module `auth` (Xác thực & phiên đăng nhập)

### Task 2.1 — Implement Auth Ports → Repositories → Services

**Mục tiêu:** Có thể lưu/tra cứu RefreshToken và OTP trong DB, băm và so khớp mật khẩu, ký JWT.

Tôi sẽ làm:
- Implement 2 interface Port (`IRefreshTokenRepository`, `IPasswordResetOtpRepository`)
- Implement 2 class Repository thật (query TypeORM)
- Implement `TokenService` (ký/giải JWT), `PasswordHashService` (bcrypt)
- Implement `passport-jwt strategy` cho `JwtAuthGuard`

**Cách kiểm thử:** Chưa gọi API được — kiểm tra bằng unit test nhỏ hoặc chờ Task 2.2.

---

### Task 2.2 — Implement Auth Command Handlers → Controller → Module

**Mục tiêu:** 5 endpoint auth hoạt động: login, refresh, logout, forgot-password, reset-password.

Tôi sẽ làm:
- Implement 5 command handler với logic đầy đủ
- Implement `auth.controller.ts` với route decorator, gọi handler
- Wire `auth.module.ts` (bind Port → Repository)

**Cách kiểm thử:**

```bash
# Khởi động server
npm run start:dev
```

Mở **Thunder Client** (hoặc Postman), gọi lần lượt:

| # | Method | URL | Body | Kết quả mong đợi |
|---|---|---|---|---|
| 1 | POST | `/api/auth/login` | `{"email":"admin@vsm.local","password":"Admin@123"}` | 200 + `access_token`, `refresh_token` |
| 2 | POST | `/api/auth/refresh` | `{"refresh_token":"<từ bước 1>"}` | 200 + `access_token` mới |
| 3 | POST | `/api/auth/logout` | Header `Authorization: Bearer <token>` | 200 |
| 4 | POST | `/api/auth/forgot-password` | `{"email":"admin@vsm.local"}` | 200, check **Mailtrap** có email OTP |
| 5 | POST | `/api/auth/reset-password` | `{"email":"...","otp_code":"<từ email>","new_password":"NewPass@123"}` | 200 |

Mở **TablePlus** → bảng `refresh_tokens` → thấy bản ghi sau login, `is_revoked=true` sau logout.

> ✅ Kết quả mong đợi: Login thành công, JWT decode được user info (`id`, `role`, `department_id`), Mailtrap nhận email OTP.

---

## Giai đoạn 3 — Module `users` (Quản lý nhân sự)

### Task 3.1 — Implement Users Port → Repository → Handlers

**Mục tiêu:** Admin tạo/sửa/vô hiệu hóa tài khoản; User tự đổi mật khẩu và avatar.

Tôi sẽ làm:
- Implement `IUserRepository` (lọc `is_active`, phân trang, search keyword)
- Implement 5 command handler + 2 query handler
- Implement upload avatar qua `IObjectStoragePort` (MinIO)

### Task 3.2 — Implement Users DTOs → Controllers → Module

**Mục tiêu:** 7 REST endpoint users hoạt động đúng phân quyền.

Tôi sẽ làm:
- Viết DTO với `class-validator`
- Viết `me.controller.ts`, `admin-users.controller.ts`
- Wire `users.module.ts`

**Cách kiểm thử:**

Dùng **Thunder Client**, đặt `Authorization: Bearer <access_token_admin>`:

| # | Method | URL | Kết quả mong đợi |
|---|---|---|---|
| 1 | GET | `/api/users/me` | Profile của Admin |
| 2 | POST | `/api/admin/users` | Body: email, full_name, employee_id, department_id, role → 201, Mailtrap nhận email mật khẩu ngẫu nhiên |
| 3 | GET | `/api/admin/users` | Danh sách phân trang, thấy 2 user |
| 4 | PATCH | `/api/admin/users/:id/status` | `{"is_active":false}` → 200, TablePlus: `is_active=false` |
| 5 | PATCH | `/api/users/me/password` | Đổi mật khẩu, login lại với mật khẩu mới → thành công |

Kiểm tra upload avatar:
- PATCH `/api/users/me/avatar` với file ảnh (multipart/form-data)
- Mở **MinIO Console** (`http://localhost:9001`) → bucket `mp2-bucket` → thấy file avatar

> ✅ Kết quả mong đợi: Admin tạo được user mới, nhân viên đó nhận email mật khẩu qua Mailtrap, avatar lưu được lên MinIO.

---

## Giai đoạn 4 — Module `departments` (Quản lý phòng ban)

### Task 4.1 — Implement Departments (Full module)

**Mục tiêu:** Admin CRUD phòng ban, đặc biệt phải kiểm chặn xóa phòng ban còn nhân sự.

Tôi sẽ làm:
- Implement `IDepartmentRepository` (bao gồm `countUsersIn`)
- Implement 4 command handler (create, update, **delete với ConflictException khi còn user**, restore)
- Implement 1 query handler + controller, wire `departments.module.ts`

**Cách kiểm thử:**

| # | Test case | Kết quả mong đợi |
|---|---|---|
| 1 | POST `/api/admin/departments` `{"name":"IT"}` | 201, TablePlus: bảng `departments` có dòng mới |
| 2 | DELETE `/api/admin/departments/:id` khi phòng ban **có user** | **409 Conflict** — `"Cannot delete department with active users"` |
| 3 | DELETE `/api/admin/departments/:id` khi phòng ban **không user** | 200, `deleted_at` không còn NULL trong TablePlus |
| 4 | POST `/api/admin/departments/:id/restore` | 200, `deleted_at=NULL` lại |
| 5 | GET `/api/admin/departments?page=1&limit=10` | Danh sách, không thấy phòng ban đã xóa |

> ✅ Kết quả quan trọng nhất: Test case #2 phải trả 409, không được xóa thành công.

---

## Giai đoạn 5 — Module `meetings` — REST cơ bản (không live)

### Task 5.1 — Implement Meeting Repositories & Ports

**Mục tiêu:** 3 repository đọc/ghi DB cho Meeting, TranscriptBlock, MeetingSummary.

Tôi sẽ làm:
- `MeetingRepository` với sort LIVE→PROCESSING→COMPLETED, filter `deleted_at IS NULL`, phân trang
- `TranscriptBlockRepository` (bulkSave, fullTextSearch dùng PostgreSQL index)
- `MeetingSummaryRepository`

**Cách kiểm thử:** Chưa gọi API — chờ Task 5.2.

---

### Task 5.2 — Implement Meeting Command Handlers

**Mục tiêu:** Tạo meeting LIVE/UPLOAD, xóa mềm, khôi phục, sửa thông tin, khóa biên bản.

Tôi sẽ làm:
- `CreateLiveMeetingHandler`, `UploadAudioMeetingHandler` (đẩy job BullMQ)
- `SoftDeleteMeetingHandler`, `RestoreMeetingHandler`, `UpdateMeetingInfoHandler`, `LockMeetingHandler`
- `EditSpeakerLabelHandler`

---

### Task 5.3 — Implement Meeting Query Handlers & Controllers

**Mục tiêu:** Người dùng xem danh sách, chi tiết cuộc họp, và tìm kiếm.

Tôi sẽ làm:
- 7 query handler (list, detail, transcript, summary-status, admin-list, search-by-title, full-text-search)
- 4 REST controller + wire `meetings.module.ts` (phần non-streaming)

**Cách kiểm thử:**

```bash
# Upload 1 file audio test (mp3/wav bất kỳ) bằng Thunder Client
POST /api/meetings/upload
Content-Type: multipart/form-data
  title: "Cuộc họp test"
  audio_file: <chọn file>
```

| # | Method | URL | Kết quả mong đợi |
|---|---|---|---|
| 1 | POST | `/api/meetings/live` | 201, `status=LIVE`, `type=LIVE` |
| 2 | POST | `/api/meetings/upload` (multipart) | 201, `status=PROCESSING`, file lên MinIO |
| 3 | GET | `/api/meetings` | Danh sách, LIVE hiện trước PROCESSING |
| 4 | GET | `/api/meetings/:id` | Chi tiết, có `audio_url` nếu COMPLETED |
| 5 | DELETE | `/api/meetings/:id` | 200, `deleted_at` set trong TablePlus |
| 6 | GET | `/api/meetings/search?q=test` | Tìm theo title |
| 7 | PATCH | `/api/admin/meetings/:id/lock` | `{"is_locked":true}` → 200 |

Mở **Redis Insight** → kết nối `localhost:6379` → xem queue `bull:transcription-batch` có job chờ xử lý sau khi upload.

> ✅ Kết quả mong đợi: Upload file → thấy job BullMQ trong Redis Insight, meeting status=PROCESSING.

---

## Giai đoạn 6 — Module `meetings` — Live STT Realtime (Trọng tâm MP2)

> **Đây là giai đoạn phức tạp và quan trọng nhất.** Cần Viettel AI credentials thật hoặc mock server để test đầy đủ.

### Task 6.1 — Implement AI Adapters (Viettel STT + Speaker Identify)

**Mục tiêu:** Gọi được Viettel AI API để chuyển audio segment → text + speaker_id.

Tôi sẽ làm: Implement 2 adapter với HTTP call, retry, timeout, chuẩn hóa response.

**Cách kiểm thử:**

Tạo file test nhỏ gọi trực tiếp adapter:
```bash
npx ts-node -e "
const adapter = new ViettelSpeechToTextAdapter(configService);
const text = await adapter.transcribe(fs.readFileSync('test-audio.wav'));
console.log(text);
"
```
> ✅ Kết quả: In ra đoạn text nhận dạng từ file audio test.
> ⚠️ Nếu chưa có AI credentials: dùng **mock adapter** trả chuỗi giả để các bước sau không bị chặn.

---

### Task 6.2 — Implement VAD & Local Audio Storage Adapters

**Mục tiêu:** Nhận audio binary → phát hiện khoảng lặng → cắt thành block → ghi file tạm.

Tôi sẽ làm: `SileroVadAdapter`, `LocalAudioStorageAdapter` (append chunk to temp file).

---

### Task 6.3 — Implement Redis Adapters (Transcript Buffer + Live Session Registry)

**Mục tiêu:** Lưu block transcript trên Redis phục vụ reconnect, quản lý slot concurrency AI.

Tôi sẽ làm: `RedisTranscriptBufferAdapter`, `RedisLiveSessionRegistryAdapter`.

**Cách kiểm thử sau 6.2 + 6.3:**

Mở **Redis Insight** sau khi bắt đầu 1 phiên live:
- Key `live_sessions:count` → số phiên đang chạy
- Key `transcript_buffer:<meeting_id>` → danh sách block đã buffer

---

### Task 6.4 — Implement Streaming Services

**Mục tiêu:** Orchestrate toàn bộ luồng live: audio → VAD → STT song song → TranscriptBlock.

Tôi sẽ làm: `TranscriptionService`, `LiveSessionService`, `ReconnectService`.

---

### Task 6.5 — Implement FinalizeSessionService & LiveSessionTimeoutListener

**Mục tiêu:** Kết thúc phiên → upload file hoàn chỉnh lên S3 → xóa file tạm → Meeting COMPLETED.

Tôi sẽ làm: `FinalizeSessionService` (cốt lõi: file tạm → MinIO → URL → DB → xóa), `LiveSessionTimeoutListener`.

---

### Task 6.6 — Implement TranscriptionGateway (WebSocket)

**Mục tiêu:** Client kết nối WebSocket, gửi audio chunk, nhận `transcript_update` realtime.

Tôi sẽ làm: Implement `transcription.gateway.ts` xử lý 6 event: `open_session`, `audio_chunk`, `edit_speaker`, `end_session`, `resume`, `handleDisconnect`.

**Cách kiểm thử (Task 6.1 → 6.6):**

Cài **[Postman](https://www.postman.com/)** (hỗ trợ WebSocket / Socket.IO) hoặc dùng `wscat`:
```bash
npm install -g wscat
```

Test flow cơ bản:
```bash
# Terminal 1 — server đang chạy npm run start:dev

# Terminal 2 — kết nối WebSocket
wscat -c "ws://localhost:3000"

# Gửi event open_session
> {"event":"open_session","data":{"meeting_id":"<uuid>","token":"<access_token>"}}

# Gửi audio chunk (dạng binary) → server emit transcript_update
# Gửi end_session
> {"event":"end_session","data":{"meeting_id":"<uuid>"}}
```

Sau `end_session` kiểm tra trong **TablePlus**:
- Bảng `meetings`: `status=COMPLETED`, `audio_url` có giá trị, `ended_at` có giá trị
- Bảng `transcript_blocks`: nhiều dòng theo `sequence_number` tăng dần
- **MinIO Console** (`http://localhost:9001`): có file audio trong bucket

> ✅ Kết quả mong đợi: Meeting chuyển COMPLETED, audio lên MinIO, transcript_blocks có dữ liệu.

---

### Task 6.7 — Implement BatchTranscriptionProcessor (Upload flow)

**Mục tiêu:** Worker xử lý nền file audio tải lên → bóc băng → COMPLETED (không cần WebSocket).

Tôi sẽ làm: BullMQ processor lắng nghe `transcription-batch`, chạy VAD → STT → bulkSave transcript.

**Cách kiểm thử:**

```bash
# Upload 1 file audio qua REST
POST /api/meetings/upload  (multipart)
```

Mở **Redis Insight** → queue `bull:transcription-batch` → thấy job chuyển trạng thái `waiting → active → completed`.

Sau vài giây, query **TablePlus**:
- `meetings` table: `status=COMPLETED`
- `transcript_blocks` table: có nhiều dòng text từ file audio

> ✅ Kết quả mong đợi: Không cần WebSocket, chỉ upload file rồi đợi → transcript tự động xuất hiện.

---

## Giai đoạn 7 — Module `meetings` — AI Summary & Export PDF

### Task 7.1 — Implement AI Summary (Generate + Processor + Controller)

**Mục tiêu:** Admin/User trigger tóm tắt AI, poll trạng thái đến khi có kết quả.

Tôi sẽ làm: `GenerateSummaryHandler` (202 PROCESSING), `SummaryGenerationProcessor` (BullMQ worker gọi AI, update COMPLETED), `SummaryController`.

**Cách kiểm thử:**

| # | Method | URL | Kết quả mong đợi |
|---|---|---|---|
| 1 | POST | `/api/meetings/:id/summary` | 202 Accepted |
| 2 | GET | `/api/meetings/:id/summary` (ngay sau) | 202, `status=PROCESSING` |
| 3 | GET | `/api/meetings/:id/summary` (sau ~5s) | 200, `summary_text` có nội dung |

TablePlus → bảng `meeting_summaries`: thấy dòng mới `status=COMPLETED`, `summary_text` khác rỗng.

---

### Task 7.2 — Implement PDF Export

**Mục tiêu:** Tải xuống biên bản cuộc họp dạng PDF.

Tôi sẽ làm: `PdfKitExporterAdapter` (dựng PDF từ meeting info + transcript blocks), `ExportController`.

**Cách kiểm thử:**

Mở **trình duyệt** (Chrome/Edge), đăng nhập lấy token, sau đó:
```
GET http://localhost:3000/api/meetings/<id>/export/pdf
Authorization: Bearer <token>
```
Hoặc dùng Thunder Client → chọn **Save Response → Save to file**.

> ✅ Kết quả mong đợi: Trình duyệt tải xuống file `.pdf`, mở ra thấy tên cuộc họp + transcript đầy đủ.

---

## Giai đoạn 8 — Module `notifications` (Thông báo realtime)

### Task 8.1 — Implement Notifications (Full module)

**Mục tiêu:** Khi Admin tạo/cập nhật cuộc họp trong phòng ban, toàn bộ nhân viên phòng ban đó nhận thông báo — cả realtime (WebSocket) lẫn REST (lịch sử).

Tôi sẽ làm:
- `NotificationRepository` (bulkCreate, findByUser, markRead)
- `MeetingEventsListener` (consume BullMQ `domain-events` → fan-out tạo `Notification` cho từng User trong phòng ban)
- 3 handler (mark-as-read, mark-all-as-read, list)
- `NotificationsController` + `NotificationsGateway` (push realtime)

**Cách kiểm thử:**

Chuẩn bị 2 tài khoản: **Admin** + **User thường** (cùng phòng ban).

```bash
# Terminal 1: Mở WebSocket kết nối notification với tài khoản User
# (Postman → New → WebSocket Request → ws://localhost:3000)
# Gửi: { "event": "subscribe", "data": { "token": "<user_token>" } }

# Terminal 2: Admin tạo cuộc họp mới trong phòng ban của User
POST /api/meetings/live  {"title":"Họp khẩn"}
```

> ✅ Kết quả mong đợi: WebSocket của User (Terminal 1) tự động nhận event `notification` với nội dung thông báo — mà User không cần refresh trang.

Kiểm tra thêm:
```
GET /api/notifications          → thấy thông báo chưa đọc, unread_count > 0
PATCH /api/notifications/:id/read  → is_read=true
PATCH /api/notifications/read-all  → tất cả thành is_read=true
```

---

## Giai đoạn 9 — Module `dashboard` (Thống kê Admin)

### Task 9.1 — Implement Dashboard (Full module)

**Mục tiêu:** Admin xem báo cáo tổng quan: KPIs, xu hướng 12 tháng, top phòng ban, phân bổ nhân sự.

Tôi sẽ làm:
- `DashboardReadRepository` (5 truy vấn SQL tổng hợp GROUP BY / JOIN)
- 5 query handler, 1 controller, wire `dashboard.module.ts`

**Cách kiểm thử:**

Dùng **Thunder Client** với token Admin:

| Endpoint | Kết quả mong đợi |
|---|---|
| GET `/api/admin/dashboard/kpis` | JSON: `{ total_meetings, total_hours, active_users, avg_hours_per_meeting }` — các số khác 0 |
| GET `/api/admin/dashboard/trends` | Array 12 phần tử, mỗi phần tử có `month`, `meeting_count`, `total_duration` |
| GET `/api/admin/dashboard/department-ranking` | Top 5 phòng ban, sắp xếp nhiều meeting nhất trước |
| GET `/api/admin/dashboard/staff-distribution` | Mỗi phòng ban kèm `user_count` và `percentage` |

> ✅ Kết quả mong đợi: Tất cả API trả 200 với dữ liệu JSON hợp lệ, số liệu khớp với dữ liệu đang có trong DB.

---

## Giai đoạn 10 — Hoàn thiện & Kiểm thử

### Task 10.1 — Unit Tests cho logic nghiệp vụ cốt lõi

**Mục tiêu:** Đảm bảo 4 rule cốt lõi không bị phá vỡ khi code thay đổi sau này.

Tôi sẽ làm:
- Test `DeleteDepartmentHandler` → must throw `ConflictException` khi còn nhân sự
- Test `FinalizeSessionService` → đúng thứ tự: upload → DB update → xóa file tạm
- Test `RolesGuard` → Admin pass route chỉ dành cho USER
- Test `RedisTranscriptBufferAdapter.getAfter(seq)` → trả đúng blocks sau sequence X

```bash
npm run test          # chạy tất cả unit test
npm run test:cov      # xem coverage report
```

> ✅ Kết quả mong đợi: Tất cả test màu xanh (passed), coverage tối thiểu 60% cho application layer.

---

### Task 10.2 — Integration & Docker Build Test

**Mục tiêu:** Build toàn bộ project, chạy đầy đủ qua Docker Compose, verify smoke test.

Tôi sẽ làm:
- Chạy `npm run build` → không còn lỗi TypeScript
- Chạy `npm run lint` → pass ESLint
- Build Docker image và chạy toàn bộ stack qua `docker compose up`

**Cách kiểm thử:**

```bash
# Build Docker image
cd backend && docker compose build backend

# Chạy toàn bộ stack (backend + postgres + redis + minio + nginx)
docker compose up -d

# Xem log backend
docker compose logs -f backend
```

Khi log báo `Application is running on port 3000`, mở Thunder Client:

```
POST https://localhost/api/auth/login    (qua Nginx port 443)
Body: {"email":"admin@vsm.local","password":"Admin@123"}
```

> ✅ Kết quả mong đợi: Login trả 200 qua Nginx (HTTPS), backend container healthy, không có lỗi startup, migration đã chạy tự động.

```bash
# Dọn dẹp sau test
docker compose down
```

---

## Tổng quan lộ trình

```
Task 1.1 → Task 1.2
                ↓
          Task 2.1 → Task 2.2
                          ↓
                    Task 3.1 → Task 3.2
                                    ↓
                              Task 4.1
                                    ↓
                        Task 5.1 → 5.2 → 5.3
                                          ↓
              Task 6.1 → 6.2 → 6.3 → 6.4 → 6.5 → 6.6 → 6.7
                                                          ↓
                               ┌──────────────────────────┤
                         Task 7.1 → 7.2    Task 8.1    Task 9.1
                               └──────────────────────────┤
                                                          ↓
                                               Task 10.1 → 10.2
```

| Giai đoạn | Task | Ưu tiên |
|---|---|---|
| 1 — Database Foundation | 1.1, 1.2 | 🔴 Phải làm trước tiên |
| 2 — Auth | 2.1, 2.2 | 🔴 Phải có trước khi làm bất cứ gì |
| 3 — Users | 3.1, 3.2 | 🔴 Phải có để test phân quyền |
| 4 — Departments | 4.1 | 🔴 Phải có vì User FK → Department |
| 5 — Meetings REST | 5.1, 5.2, 5.3 | 🟠 Nền tảng cho các feature Meeting |
| 6 — Live STT Realtime | 6.1 → 6.7 | 🟠 Trọng tâm MP2, phức tạp nhất |
| 7 — Summary & PDF | 7.1, 7.2 | 🟡 Có thể làm song song sau giai đoạn 5 |
| 8 — Notifications | 8.1 | 🟡 Có thể làm song song sau giai đoạn 5 |
| 9 — Dashboard | 9.1 | 🟡 Có thể làm song song sau giai đoạn 5 |
| 10 — Polish & Test | 10.1, 10.2 | 🟢 Làm sau cùng |
