// REST self-service (yêu cầu JWT):
//   GET   /users/me           → hồ sơ tài khoản đang đăng nhập
//   PATCH /users/me/password  → đổi mật khẩu (xác thực old_password)
//   PATCH /users/me/avatar    → upload avatar lên Object Storage, cập nhật avatar_url
