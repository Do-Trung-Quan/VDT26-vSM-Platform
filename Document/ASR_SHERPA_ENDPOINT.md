# ASR Sherpa Endpoint

### Request

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Content-Type** | `multipart/form-data` |
| **Field name** | `files` (có thể gửi nhiều file trong một request) |
| **File format** | WAV (`audio/wav`) |
| **Timeout** | Theo `TIMEOUT` env (mặc định 300 giây) |

Mỗi file được đặt tên dạng `file_1.wav`, `file_2.wav`, …

### Response

JSON **array**, mỗi phần tử tương ứng với một file đã gửi (theo thứ tự):

```json
[
  { "transcript": "xin chào việt nam" },
  { "transcript": "đoạn thứ hai" }
]
```

Trường bắt buộc: `transcript` (string).

### Ví dụ cURL — một file

```bash
curl -X POST "http://127.0.0.1:9981/api/transcribe/batch/sherpa" \
  -F "files=@/path/to/audio.wav;type=audio/wav"
```

### Ví dụ cURL — nhiều file (batch)

```bash
curl -X POST "http://127.0.0.1:9981/api/transcribe/batch/sherpa" \
  -F "files=@segment_1.wav;type=audio/wav" \
  -F "files=@segment_2.wav;type=audio/wav"
```

Response mẫu:

```json
[
  { "transcript": "câu nói của segment 1" },
  { "transcript": "câu nói của segment 2" }
]
```