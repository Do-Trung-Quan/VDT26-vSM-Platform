// REST quản trị (@Roles('ADMIN'), Group C):
//   GET   /admin/meetings         → danh sách toàn hệ thống (không giới hạn phòng ban)
//   PATCH /admin/meetings/:id      → sửa title/description/department_id (điều chuyển), bắn thông báo phòng ban cũ/mới
//   POST  /admin/meetings/:id/restore → khôi phục cuộc họp đã xóa mềm
//   PATCH /admin/meetings/:id/lock → khóa/mở khóa biên bản (is_locked, bảo vệ tính pháp lý)
