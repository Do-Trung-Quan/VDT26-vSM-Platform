// REST controller (@Public ở các route công khai):
//   POST /auth/login            → đăng nhập, cấp access+refresh token
//   POST /auth/refresh          → đổi refresh_token lấy access_token mới
//   POST /auth/logout           → revoke refresh_token hiện tại (is_revoked=true)
//   POST /auth/forgot-password  → sinh & gửi OTP qua email
//   POST /auth/reset-password   → xác thực OTP còn hạn & đặt mật khẩu mới
