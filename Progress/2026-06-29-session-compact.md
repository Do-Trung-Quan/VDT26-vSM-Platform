# Session Compact — MP2 vSM Platform
> Dùng cho đoạn chat mới để tiếp tục roadmap mà không mất context

---

## 1. Tổng quan dự án

| Hạng mục | Giá trị |
|---|---|
| **Phân hệ** | MP2 — Intelligent Meeting Transcription System |
| **Kiến trúc** | Modular Monolith + DDD (4 lớp: presentation → application → domain ← infrastructure) |
| **Backend** | NestJS · PORT 3001 · `c:\VDT\Project\VDT26-MP2\backend\` |
| **Frontend** | Next.js 16 App Router · `c:\VDT\Project\VDT26-MP2\frontend\` |
| **DB** | PostgreSQL port 5433 (host), Redis 6379, MinIO 9000/9001 |
| **AI** | Viettel ASR Sherpa (STT) + Viettel Embedding (Speaker Diarization) |
| **AI Endpoints** | `AI_SPEECH_TO_TEXT_URL` và `AI_SPEAKER_IDENTIFY_URL` trong `.env` |

---

## 2. Trạng thái hoàn thành (tính đến 2026-06-29)

### Phase 1–4 ✅
- Database (8 entities, migrations, seed admin)
- Auth (JWT, refresh, OTP, BullMQ email)
- Users (CRUD, avatar MinIO, phân quyền)
- Departments (CRUD soft-delete, constraint 409)
- Frontend merged: users, departments, personal pages

### Phase 5 ✅
- 14 REST endpoints meeting (create live/upload, list, detail, delete, restore, lock, edit, search, full-text-search)
- DTO đã refactor: `requestDto/` + `responseDto/` subfolders
- Response format: Nhóm A=Full DTO, Nhóm B=MeetingUpdateResponseDto (8 field), Nhóm C=`{message}` only
- Frontend merged: meetings/page.tsx, meeting-form-dialog, meeting-edit-dialog

### Phase 6 — Core 1 + Core 3 ✅ (BACKEND)
Backend đã implement đầy đủ và test pass:

**Core 1 — Live Meeting Realtime STT:**
- `SileroVadAdapter` — Energy-based VAD (RMS threshold, frame size theo browser sample rate)
- `AudioConverter` — PCM → WAV 16kHz via ffmpeg (`FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe`)
- `ViettelSpeechToTextAdapter` — Real HTTP call, parse `[{transcript}]`
- `ViettelSpeakerIdentifyAdapter` — Real HTTP call, parse `[{success, embedding, shape}]`
- `SpeakerDiarizationService` — Cosine similarity, online clustering, lazy new-speaker creation
- `LocalAudioStorageAdapter` — WriteStream to `%TEMP%/audio-{meetingId}.pcm`
- `RedisTranscriptBufferAdapter` — RPUSH blocks, TTL resume window
- `RedisLiveSessionRegistryAdapter` — Global session count, per-user count
- `TranscriptionService` — Orchestrate: VAD → STT+Embedding (parallel) → Diarize → buffer → emit
- `LiveSessionService` — Open/disconnect/cleanup registry
- `FinalizeSessionService` — close → bulkSave → upload MinIO → publish LiveSessionEndedEvent
- `MeetingEventsListener` — Consume domain events → update Meeting.COMPLETED
- `LiveSessionTimeoutListener` — BullMQ queue `live-session-timeout`, auto-finalize on TTL expiry

**Core 3 — Auto-Reconnect:**
- `ReconnectService` — Cancel TTL, check meeting LIVE, get missed_blocks, check VAD instance
- `TranscriptionGateway` — WS events: open_session, audio_chunk, edit_speaker, end_session, resume, handleDisconnect
- Disconnect → `setResumeTtl(120s)` + BullMQ delayed job `session_timeout`
- Resume → cancel TTL + job → send missed_blocks → continue streaming

**Rate limiting:**
- `@nestjs/throttler` — Create live: 3/min, Upload: 2/min
- `CreateLiveMeetingHandler` — Check `countActiveByStatus(LIVE) >= maxConcurrent` → 409

**Frontend Core 1+3:**
- `app/live/page.tsx` — Fully implemented:
  - WS connection (socket.io-client, namespace `/live`)
  - Browser audio capture (AudioContext 48kHz → Int16 PCM → audio_chunk)
  - Guidance banner khi idle
  - 2 timers: meeting timer (không dừng) + audio timer (dừng khi pause)
  - Speaker avatar + label grouping (consecutive same speaker = chỉ hiện avatar/label lần đầu)
  - Real-time connection status banner
  - Core 3: auto-reconnect với resume_ok, missed_blocks merge

---

## 3. Config quan trọng trong `.env`

```
PORT=3001
AI_SPEECH_TO_TEXT_URL=https://9981--main--nlp--sinhnq3.coder.vts-ai.space/api/transcribe/batch/sherpa
AI_SPEAKER_IDENTIFY_URL=https://9981--main--nlp--sinhnq3.coder.vts-ai.space/api/diarization/embedding
AI_TIMEOUT_MS=10000
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
AUDIO_BROWSER_SAMPLE_RATE=48000
LIVE_RESUME_TTL_SECONDS=120
LIVE_MAX_CONCURRENT_SESSIONS=20
VAD_SILENCE_THRESHOLD_MS=600
```

---

## 4. Queue names (BullMQ)

```typescript
QUEUE_NAMES = {
  TRANSCRIPTION_BATCH: 'transcription-batch',   // upload audio batch
  SUMMARY_GENERATION: 'summary-generation',
  DOMAIN_EVENTS: 'domain-events',               // LiveSessionEndedEvent
  MAIL_OTP: 'mail-otp',
  LIVE_SESSION_TIMEOUT: 'live-session-timeout', // Core 3 disconnect timeout
}
```

---

## 5. WebSocket events (namespace /live)

| Event (Client → Server) | Payload |
|---|---|
| `open_session` | `{ meetingId, token }` |
| `audio_chunk` | `{ meetingId, audio: number[] }` — raw PCM 48kHz Int16 LE bytes |
| `edit_speaker` | `{ meetingId, fromSequence, oldLabel, newLabel }` |
| `end_session` | `{ meetingId }` |
| `resume` | `{ meetingId, token, lastReceivedSequence }` |

| Event (Server → Client) | Payload |
|---|---|
| `session_ready` | `{ meetingId }` |
| `transcript_update` | `{ sequenceNumber, text, speakerLabel, startTime, endTime }` |
| `resume_ok` | `{ missedBlocks[], vadReinitialized }` |
| `session_ended` | `{ meetingId }` |
| `error` | `{ message }` |

---

## 6. API Response format (TẤT CẢ endpoints)

```json
{ "statusCode": 200, "message": "...", "data": <any>, "meta": <pagination|null> }
```
- `message` LUÔN nằm ngoài `data`
- Paginated: `data = items[]`, `meta = { total, page, limit, totalPages }`

---

## 7. Những gì CHƯA làm (Roadmap còn lại)

### Phase 6 còn lại:
- **Core 2 — Upload Batch** (`BatchTranscriptionProcessor`): BullMQ worker xử lý file upload
  - VAD toàn bộ file → AudioConverter batch → 1 req ASR (N files) + 1 req Embedding → offline clustering → bulkSave → COMPLETED
  - Sử dụng `SpeakerDiarizationService.clusterOffline()` (đã implement sẵn)

### Phase 7:
- AI Summary: `GenerateSummaryHandler` (202) → `SummaryGenerationProcessor` (BullMQ) → update COMPLETED
- PDF Export: `PdfKitExporterAdapter`

### Phase 8:
- Notifications module: `NotificationRepository`, `MeetingEventsListener` fan-out, REST + WS gateway

### Phase 9:
- Dashboard: 5 SQL aggregation queries, admin-only

### Phase 10:
- Unit tests (4 core cases), Docker build test

### Frontend còn lại:
- `app/meetings/[id]/page.tsx` — Meeting detail viewer (transcript + AI summary + audio player) — còn dùng mock data
- Notifications (icon chuông, real-time WS)
- Dashboard page

---

## 8. Quy tắc kiến trúc BẮT BUỘC

1. **DDD 4 lớp**: presentation → application → domain ← infrastructure. Không inject adapter vào handler, chỉ inject Port.
2. **Không hard delete** User/Meeting. Soft delete qua `deleted_at`, `is_active`, `is_revoked`.
3. **Không tạo orm-entity/mapper** — entity dùng trực tiếp TypeORM decorator.
4. **Sau khi sửa entity** → phải sinh migration (`npm run migration:generate`).
5. **Message** luôn nằm ngoài `data` trong response.
6. **`message` KHÔNG được ở trong `data`** của response API.

---

## 9. Feedback user đã confirm

- Không tự sửa file khi user chưa yêu cầu
- Xin confirm trước khi thêm file/pattern ngoài scope
- Đánh giá clean architecture TRƯỚC khi implement, không chỉ nghĩ đến "chạy được"
- DTO refactor Phase 2-4 còn pending (chưa ưu tiên)
- Test thủ công bằng Postman + Redis Insight + pgAdmin (không dùng jest e2e)
- FFMPEG_PATH có thể hardcode cho dev Windows, deploy Linux đổi thành `ffmpeg`

---

## 10. Speaker Diarization — thresholds hiện tại

User đã chỉnh (trong `speaker-diarization.service.ts`):
```typescript
const SIMILARITY_ASSIGN = 0.55; // từ 0.82 xuống — dễ match hơn
const SIMILARITY_MERGE  = 0.65; // từ 0.88 xuống
```
Vẫn còn vấn đề: cùng 1 người nói to/nhanh/cao khác pitch → bị nhầm thành người mới.
Đề xuất chưa implement: two-stage threshold + lazy new-speaker creation (cần N lần liên tiếp không match mới tạo speaker mới).
