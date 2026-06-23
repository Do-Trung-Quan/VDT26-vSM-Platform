// WebSocket Gateway (Group F realtime) — CỐT LÕI MP2, xử lý các event:
//   'open_session'      → xác thực JWT, kiểm ngưỡng số phiên Live, khởi tạo buffer Redis + VAD instance
//   'audio_chunk'       → nhận byte audio thô, ghi nối tiếp file tạm, đẩy vào VAD
//   emit 'transcript_update' → trả block hoàn chỉnh (text, speaker, start/end_time) mỗi khi VAD cắt xong
//   'edit_speaker'      → đổi nhãn người nói lúc đang live, áp dụng cho phát biểu tiếp theo (Group G)
//   'end_session'       → kích hoạt Finalize (đóng file, upload S3, lưu transcript, COMPLETED)
//   'resume'            → reconnect: bù missed_blocks theo last_received_sequence (Scenario 3)
//   handleDisconnect()  → báo Application đặt TTL chờ resume trên Redis
