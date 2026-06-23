// REST quản trị (@Roles('ADMIN')):
//   GET    /admin/departments          → danh sách phòng ban (phân trang)
//   POST   /admin/departments          → tạo phòng ban mới (kiểm tra trùng tên trong nhóm còn hoạt động)
//   PATCH  /admin/departments/:id       → sửa tên (kiểm tra không trùng tên phòng ban đang hoạt động)
//   DELETE /admin/departments/:id       → XÓA MỀM (chặn nếu còn User), set deleted_at
//   POST   /admin/departments/:id/restore → khôi phục phòng ban đã xóa mềm (nếu còn hạn)
