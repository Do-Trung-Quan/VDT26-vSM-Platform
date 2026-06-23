// REST khởi tạo nguồn cuộc họp (Group F):
//   POST /meetings/live           → tạo Meeting type=LIVE, status=LIVE (department_id ép theo User nếu không phải Admin)
//   POST /meetings/upload         → tạo Meeting type=UPLOAD, status=PROCESSING, đẩy job bóc băng nền
