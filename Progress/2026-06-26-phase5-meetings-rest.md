# Giai đoạn 5 — Module Meetings REST (không live/AI): HOÀN THÀNH

**Ngày:** 2026-06-26
**Trạng thái:** ✅ Tất cả task hoàn tất, build clean

---

## Những gì đã làm

### 5.1 — Token + Domain Ports

| File | Nội dung |
|---|---|
| `meetings.tokens.ts` | 3 repo tokens (Phase 5) + 7 Phase 6/7 tokens dự phòng |
| `meeting.repository.port.ts` | `IMeetingRepository`: save, findById, findActiveById, listByDepartment, listAll, searchByTitle |
| `transcript-block.repository.port.ts` | `ITranscriptBlockRepository`: bulkSave, findByMeeting, fullTextSearch, updateSpeakerLabelFrom |
| `meeting-summary.repository.port.ts` | `IMeetingSummaryRepository`: save, findByMeeting |
| `speech-to-text.port.ts` | **Batch** signature: `batchTranscribe(Buffer[]) → string[]` |
| `speaker-embedding.port.ts` | **MỚI** (thay speaker-identify): `batchGetEmbeddings(Buffer[]) → (number[]\|null)[]` |
| `vad.port.ts` | `IVadPort`: feed(sessionId, pcm), flush(sessionId), clearSession |
| `local-audio-storage.port.ts` | `ILocalAudioStoragePort`: append, close → path, remove |
| `pdf-exporter.port.ts` | `IPdfExporterPort`: export(meeting, transcript) → Buffer |

### 5.2 — Infrastructure Repositories

- **`MeetingRepository`**: dùng `CASE WHEN status='LIVE' THEN 1 ...` để sort LIVE→PROCESSING→COMPLETED; raw column name trong QB (tránh FK ambiguity)
- **`TranscriptBlockRepository`**: `bulkSave` dùng `repo.save(blocks[])`, `fullTextSearch` join với meetings để filter dept/date
- **`MeetingSummaryRepository`**: đơn giản, 1:1 với Meeting

### 5.3 — Domain Events + DTOs

- `MeetingCreatedEvent` — publish khi tạo live/upload meeting
- `MeetingInfoUpdatedEvent` — publish khi admin cập nhật thông tin
- 5 DTO chính: `CreateLiveMeetingDto`, `UploadAudioMeetingDto`, `UpdateMeetingInfoDto`, `ListMeetingsQueryDto`, `MeetingDetailDto`, `TranscriptBlockDto`

### 5.4 — Handlers

**Command (8):**
- `CreateLiveMeetingHandler` — ép dept theo User role; `startLive()`; publish MeetingCreatedEvent
- `UploadAudioMeetingHandler` — upload WAV/MP3 lên MinIO (key); tạo PROCESSING; push BullMQ job (worker Phase 6)
- `SoftDeleteMeetingHandler` — kiểm tra quyền (host hoặc ADMIN)
- `RestoreMeetingHandler`, `UpdateMeetingInfoHandler` (publish MeetingInfoUpdatedEvent), `LockMeetingHandler`, `EditSpeakerLabelHandler`

**Query (7):**
- `ListMeetingsHandler` — filter by dept (dept scope)
- `ListAllMeetingsHandler` — admin, cross-dept
- `GetMeetingDetailHandler` — trả `audioUrl` dạng **pre-signed URL** (3h TTL cho audio player)
- `GetTranscriptHandler`, `SearchMeetingsHandler`, `GetSummaryHandler` (202/200 logic), `FullTextSearchHandler`

### 5.5 — Controllers + Module

- `MeetingsController` (Group B) — `@UseGuards(DepartmentScopeGuard)`
- `LiveMeetingsController` (Group F) — POST `/meetings/live`, `POST /meetings/upload` (Multer memory storage)
- `AdminMeetingsController` (Group C) — `@Roles(ADMIN)`
- `SummaryController` (Group G partial) — GET trả 202/200; POST trả "chưa tích hợp" cho Phase 7
- `SearchController` (Group G) — full-text search
- `ExportController` — Phase 7, chưa implement
- `meetings.module.ts` — bind 3 repos, import ObjectStorageModule + EventBusModule + QueueModule

---

## Kiến trúc thay đổi từ Phase 5

1. **`ISpeakerEmbeddingPort`** (thay thế `ISpeakerIdentifyPort`): trả embedding vector thay vì speaker_id
2. **`ISpeechToTextPort`** đổi sang batch signature
3. **`IVadPort`** chuẩn bị cho `WebrtcVadAdapter` (Phase 6)
4. **Summary endpoint** — skeleton, Phase 7 tích hợp AI bên ngoài
5. **Audio URL** trong detail response luôn là pre-signed URL (3h) — tương tự avatar

---

## Cách kiểm tra

```bash
npm run start:dev   # PORT=3001
```

> **Lưu ý audio URL:** `audioUrl` trong response là pre-signed URL TTL=3h — đủ cho 1 phiên làm việc. Nếu tab để mở quá 3h, cần refresh để lấy URL mới. Sẽ xem xét đổi cách tiếp cận nếu có yêu cầu từ mentor.

### Group F — Live & Upload

| # | Method | Endpoint | Test |
|---|---|---|---|
| 1 | POST | `/api/meetings/live` | Body: `{"title":"Họp kỹ thuật"}` → 201, `status=LIVE`, `type=LIVE` |
| 2 | POST | `/api/meetings/upload` | multipart: field `title=...` + `audio_file=<wav/mp3>` → 201, `status=PROCESSING`; Redis Insight: job `transcription-batch` xuất hiện |

### Group B — Meetings (User + Admin)

| # | Method | Endpoint | Tham số đầu vào | Kết quả mong đợi |
|---|---|---|---|---|
| 3 | GET | `/api/meetings` | **Query (tất cả optional):** `page` (default 1), `limit` (default 20), `status` (LIVE\|PROCESSING\|COMPLETED), `departmentId` (UUID, Admin only), `fromDate` (ISO), `toDate` (ISO) | List meetings phòng ban của user, sort LIVE→PROCESSING→COMPLETED rồi `createdAt` DESC |
| 4 | GET | `/api/meetings/search` | **Query:** `keyword` (string, optional), `page` (default 1), `limit` (default 20) | Meetings khớp title trong phòng ban user (hoặc toàn hệ thống nếu Admin) |
| 5 | GET | `/api/meetings/:id` | **Param:** `id` (UUID) | Detail meeting + `audioUrl` pre-signed 3h (null nếu chưa có file audio) |
| 6 | GET | `/api/meetings/:id/transcript` | **Param:** `id` (UUID) | Array `TranscriptBlock[]` — rỗng đến Phase 6 |
| 7 | DELETE | `/api/meetings/:id` | **Param:** `id` (UUID). User chỉ xóa được meeting do mình tạo; Admin xóa được tất cả | 200, `deleted_at` set trong pgAdmin |

### Group G — Nâng cao

| # | Method | Endpoint | Tham số đầu vào | Kết quả mong đợi |
|---|---|---|---|---|
| 8 | GET | `/api/meetings/full-text-search` | **Query:** `keyword` (string, bắt buộc), `departmentId` (UUID, optional), `fromDate` (ISO, optional), `toDate` (ISO, optional), `page` (default 1), `limit` (default 20, max 50) | `{ items: [], total: 0 }` — rỗng đến Phase 6 có transcript |
| 9 | GET | `/api/meetings/:id/summary` | **Param:** `id` (UUID) | 202 nếu `NOT_STARTED` hoặc `PROCESSING`; 200 + `summaryText` nếu `COMPLETED` |
| 10 | POST | `/api/meetings/:id/summary` | **Param:** `id` (UUID). Không cần body | 202, message placeholder — Phase 7 tích hợp AI |

### Group C — Admin Meetings

| # | Method | Endpoint | Tham số đầu vào | Kết quả mong đợi |
|---|---|---|---|---|
| 11 | GET | `/api/admin/meetings` | **Query (tất cả optional):** `page` (default 1), `limit` (default 20), `departmentId` (UUID), `status` (LIVE\|PROCESSING\|COMPLETED), `fromDate` (ISO), `toDate` (ISO) | Toàn bộ meetings mọi phòng ban |
| 12 | PATCH | `/api/admin/meetings/:id` | **Param:** `id` (UUID). **Body (tất cả optional):** `title` (string), `description` (string), `departmentId` (UUID) | 200, thông tin đã cập nhật; publish `MeetingInfoUpdatedEvent` |
| 13 | POST | `/api/admin/meetings/:id/restore` | **Param:** `id` (UUID). Không cần body | 200, meeting khôi phục (`deleted_at = null`) |
| 14 | PATCH | `/api/admin/meetings/:id/lock` | **Param:** `id` (UUID). **Body:** `isLocked` (boolean) | 200. Chỉ hoạt động khi meeting `status = COMPLETED` |

---

## Trạng thái sau Phase 5

```
✅ Module meetings — REST CRUD hoàn chỉnh (không AI/streaming)
✅ Audio upload lên MinIO, job BullMQ enqueued (worker Phase 6)
✅ Sort LIVE→PROCESSING→COMPLETED trong list
✅ Pre-signed audioUrl trong detail response
⏳ BatchTranscriptionProcessor — Phase 6
⏳ TranscriptionGateway (WebSocket live) — Phase 6
⏳ AI Summary — Phase 7
⏳ Export PDF — Phase 7
⏳ Frontend merge meetings — Phase 5 tiếp theo
```

**Bước tiếp theo:** Merge frontend meetings page với API thật (update `lib/types.ts` Meeting type + tạo `lib/api/meetings.ts` + kết nối `meetings/page.tsx` + `meetings/[id]/page.tsx`).
