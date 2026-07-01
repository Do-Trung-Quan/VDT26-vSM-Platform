# Test Guide — Core 2: Upload Audio & Batch Transcription

> Luồng: Upload MP3/WAV → PROCESSING → BullMQ worker → VAD → STT → Speaker Diarization → COMPLETED + transcript

---

## Chuẩn bị

```bash
# 1. Chạy docker-compose (backend + postgres + redis + minio)
docker-compose up -d

# 2. Lấy access_token (dùng account Admin hoặc User thường)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vsm.vn","password":"YOUR_PASS"}'
# → lưu access_token vào biến TOKEN
TOKEN="eyJhbGc..."
```

---

## Bước 1 — Upload file audio

```bash
curl -X POST http://localhost:3000/api/meetings/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Cuộc họp thử nghiệm upload" \
  -F "description=Test Core 2" \
  -F "audio_file=@/path/to/your/test.mp3"  # hoặc test.wav
```

**Response mong đợi (HTTP 201):**
```json
{
  "data": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "title": "Cuộc họp thử nghiệm upload",
    "type": "UPLOAD",
    "status": "PROCESSING",
    "audioUrl": "audio/<meeting-id>.mp3",
    "departmentId": "...",
    ...
  }
}
```

> Lưu `MEETING_ID` từ response để dùng ở các bước sau.

---

## Bước 2 — Kiểm tra MinIO (file đã upload chưa)

Mở MinIO Console: **http://localhost:9001** (user: `minio` / pass: `minio123` hoặc xem `.env`)

- [ ] Vào bucket `vsmedia` (hoặc tên bucket trong config)
- [ ] Tìm object `audio/<MEETING_ID>.mp3` (hoặc `.wav`)
- [ ] Verify: object tồn tại, size > 0

---

## Bước 3 — Kiểm tra PostgreSQL (meeting đã tạo chưa)

Mở pgAdmin: **http://localhost:5050**

```sql
SELECT id, title, type, status, audio_url, duration_seconds, started_at, ended_at
FROM meetings
WHERE id = '<MEETING_ID>';
```

- [ ] `status = 'PROCESSING'`
- [ ] `audio_url = 'audio/<MEETING_ID>.mp3'`
- [ ] `duration_seconds IS NULL` (chưa xử lý xong)
- [ ] `started_at IS NULL` (batch processor sẽ set)

---

## Bước 4 — Kiểm tra BullMQ job đã vào queue bằng Redis Insight

Mở **Redis Insight** và kết nối tới database Redis của dự án:

1. **Tìm hàng đợi (Queue):**
   * Trong thanh tìm kiếm (Filter by key) ở trên cùng, nhập: `bull:transcription-batch:*`
   * Trong cây thư mục bên trái, tìm đến thư mục: `bull` -> `transcription-batch`.
2. **Kiểm tra danh sách job chờ xử lý:**
   * Chọn key dạng **List** có tên là `wait` (đường dẫn đầy đủ: `bull:transcription-batch:wait`).
   * Ở bảng bên phải (List values), bạn sẽ thấy danh sách các ID của job đang đợi (ví dụ: `1`, `2`, hoặc UUID).
3. **Xem chi tiết Payload của Job:**
   * Tìm key dạng **Hash** ứng với ID của job vừa tìm thấy (đường dẫn dạng: `bull:transcription-batch:<JOB_ID>`).
   * Chọn key này, bảng bên phải sẽ hiển thị các thuộc tính (fields) của job:
     * **Field `name`:** Có giá trị là `"batch-transcribe-meeting"`.
     * **Field `data`:** Chứa chuỗi JSON payload. Bạn double-click vào để xem, giá trị phải chứa:
       `{"meetingId": "<MEETING_ID>", "audioKey": "audio/<MEETING_ID>.mp3"}`.

---

## Bước 5 — Poll progress trong khi xử lý

Gọi liên tục (cứ 2 giây) để xem tiến độ:

```bash
curl http://localhost:3000/api/meetings/<MEETING_ID>/upload-progress \
  -H "Authorization: Bearer $TOKEN"
```

**Các mốc progress mong đợi (tuần tự):**
```
percent=0,  stage="Đang tải file audio..."
percent=5,  stage="Đang chuyển đổi định dạng âm thanh..."
percent=15, stage="Đang phân tích âm thanh..."
percent=25, stage="Đang nhận dạng giọng nói... (0/N)"
percent=~60, stage="Đang nhận dạng giọng nói... (M/N)"
percent=93, stage="Đang lưu biên bản..."
percent=98, stage="Đang hoàn thiện..."
```

Khi xử lý xong → Redis key bị xóa → endpoint trả về:
```json
{
  "status": "COMPLETED",
  "percent": 100,
  "stage": "Hoàn thành",
  "totalSegments": 0,
  "processedSegments": 0
}
```

**Kiểm tra bằng Redis Insight trong khi processing:**

1. **Tìm Key tiến trình:**
   * Trong ô tìm kiếm (Filter by key) của Redis Insight, nhập: `upload:<MEETING_ID>:progress` (hoặc vào thư mục `upload` -> `<MEETING_ID>` -> click chọn key `progress`).
   * Key này có kiểu dữ liệu là **String**.
2. **Kiểm tra tiến độ thực tế:**
   * Nhìn vào cột **Value** ở khung bên phải, bạn sẽ thấy chuỗi JSON tiến độ cập nhật liên tục:
     `{"percent": 15, "stage": "Đang phân tích âm thanh...", "totalSegments": 10, "processedSegments": 2}`
     * **Chỉ số `percent`:** Tỉ lệ hoàn thành (tăng dần từ 0 đến 98).
     * **Chỉ số `stage`:** Trạng thái xử lý hiện tại (ví dụ: "Đang nhận dạng giọng nói...").
3. **Kiểm tra thời gian sống (TTL):**
   * Nhìn vào thuộc tính **TTL** (Time To Live) hiển thị ở góc trên của key trong Redis Insight:
     * Nó sẽ hiển thị số giây đếm ngược (bắt đầu từ tối đa `86400` giây - 24 giờ).
4. **Xác nhận hoàn tất (Redis Cleanup):**
   * Sau khi quá trình xử lý hoàn tất (Progress đạt 100%), backend sẽ tự động xóa key này.
   * Tìm kiếm lại key `upload:<MEETING_ID>:progress` trên Redis Insight sẽ hiển thị thông báo **"Key not found"** (Key đã được dọn dẹp sạch sẽ).

---

## Bước 6 — Kiểm tra kết quả cuối (PostgreSQL)

```sql
-- Meeting đã COMPLETED chưa?
SELECT id, status, audio_url, duration_seconds, started_at, ended_at, updated_at
FROM meetings
WHERE id = '<MEETING_ID>';
```

- [ ] `status = 'COMPLETED'`
- [ ] `duration_seconds > 0` (tính từ end_time của block cuối)
- [ ] `ended_at IS NOT NULL`
- [ ] `audio_url` vẫn là key cũ (không đổi)

```sql
-- Transcript blocks đã lưu chưa?
SELECT sequence_number, speaker_label, text, start_time, end_time
FROM transcript_blocks
WHERE meeting_id = '<MEETING_ID>'
ORDER BY sequence_number;
```

- [ ] Có ít nhất 1 block (nếu file có giọng nói)
- [ ] `speaker_label` được gán nhãn ("Người nói 1", "Người nói 2"...)
- [ ] `start_time < end_time` với mọi block
- [ ] `sequence_number` tăng dần từ 1

---

## Bước 7 — Lấy transcript qua API

```bash
curl http://localhost:3000/api/meetings/<MEETING_ID>/transcript \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] Response trả về mảng blocks đúng cấu trúc
- [ ] Thứ tự theo `sequence_number`

---

## Bước 8 — Lấy chi tiết meeting

```bash
curl http://localhost:3000/api/meetings/<MEETING_ID> \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] `status = "COMPLETED"`
- [ ] `audioUrl` có thể dùng để play lại (signed URL hoặc public URL)

---

## Kiểm tra lỗi & edge cases

### 8a. File sai định dạng (MP4, DOCX...)
```bash
curl -X POST http://localhost:3000/api/meetings/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Test lỗi format" \
  -F "audio_file=@/path/to/file.mp4"
```
- [ ] HTTP 400: `"Chỉ chấp nhận file MP3 hoặc WAV"`

### 8b. Không gửi file
```bash
curl -X POST http://localhost:3000/api/meetings/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Test không có file"
```
- [ ] HTTP 400: `"Vui lòng đính kèm file audio (audio_file)"`

### 8c. File im lặng (không có tiếng nói)
- Upload 1 file WAV chứa toàn noise/im lặng
- [ ] Meeting chuyển sang `COMPLETED` với `duration_seconds = 0`
- [ ] `transcript_blocks` table: 0 rows cho meeting này
- [ ] Progress endpoint trả `status="COMPLETED"`

### 8d. Poll progress sau khi đã COMPLETED
```bash
curl http://localhost:3000/api/meetings/<MEETING_ID>/upload-progress \
  -H "Authorization: Bearer $TOKEN"
```
- [ ] `status = "COMPLETED"`, `percent = 100` (đọc từ DB vì Redis key đã xóa)

---

## Tóm tắt bảng kiểm tra

| Mốc | Nơi kiểm tra | Điều kiện pass |
|-----|-------------|----------------|
| File lưu MinIO | MinIO Console | Object tồn tại, size > 0 |
| Meeting tạo DB | pgAdmin | status=PROCESSING, audio_url đúng |
| Job vào queue | Redis `bull:transcription-batch:*` | Job payload đúng |
| Progress live | API `/upload-progress` + Redis | percent tăng 0→98 |
| Redis cleanup | Key `upload:...:progress` (Redis Insight) | Key bị xóa sau complete |
| Meeting COMPLETED | pgAdmin `meetings` | status=COMPLETED, duration_seconds>0 |
| Transcript lưu | pgAdmin `transcript_blocks` | Rows có text+speaker+timestamps |
| API response | GET `/meetings/:id/transcript` | Mảng blocks hợp lệ |
