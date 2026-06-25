# Embedding Endpoint

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
  {
    "embedding": [0.012, -0.034, 0.056, "..."]
  },
  {
    "embedding": [0.021, -0.018, 0.041, "..."]
  }
]
```

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `embedding` | `List[float]` | Vector đặc trưng giọng nói; kích thước khớp `VECTOR_SIZE` (512) |

Nếu embedding không hợp lệ, phần tử có thể trả `embedding: null` — diarization pipeline xử lý trường hợp này bằng `point_id = -2`.

### Ví dụ cURL — một file

```bash
curl -X POST "http://127.0.0.1:9981/api/diarization/embedding" \
  -F "files=@/path/to/speaker_sample.wav;type=audio/wav"
```

### Ví dụ cURL — batch nhiều segment

```bash
curl -X POST "http://127.0.0.1:9981/api/diarization/embedding" \
  -F "files=@segment_1.wav;type=audio/wav" \
  -F "files=@segment_2.wav;type=audio/wav"
```

Response mẫu:

```json
[
  { "embedding": [0.01, 0.02, "..."] },
  { "embedding": [0.03, -0.01, "..."] }
]
```