// REST tra cứu theo phòng ban (JWT + DepartmentScopeGuard):
//   GET    /meetings              → danh sách (ưu tiên LIVE→PROCESSING→COMPLETED, rồi created_at desc)
//   GET    /meetings/search       → tìm theo title trong phạm vi phòng ban
//   GET    /meetings/:id          → chi tiết Meeting + audio_url (hỗ trợ HTTP Range cho player)
//   GET    /meetings/:id/transcript → danh sách TranscriptBlock (đồng bộ theo audio)
//   DELETE /meetings/:id          → xóa mềm (User chỉ xóa cuộc họp mình host; Admin xóa mọi cuộc họp)
