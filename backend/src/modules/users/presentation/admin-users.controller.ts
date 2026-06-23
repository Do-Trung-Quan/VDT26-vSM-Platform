// REST quản trị (@Roles('ADMIN')):
//   GET   /admin/users        → danh sách nhân sự (phân trang, filter phòng ban/trạng thái, keyword)
//   POST  /admin/users        → tạo tài khoản mới, sinh mật khẩu ngẫu nhiên gửi email
//   PATCH /admin/users/:id    → sửa role, department_id (không đụng avatar/password)
//   PATCH /admin/users/:id/status → vô hiệu hóa/kích hoạt (is_active)
