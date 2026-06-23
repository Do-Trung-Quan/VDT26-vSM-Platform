// REST quản trị (@Roles('ADMIN')):
//   GET /admin/dashboard/kpis                → tổng số họp, tổng giờ audio, số User active, TB giờ/cuộc họp
//   GET /admin/dashboard/trends              → biểu đồ 12 tháng (số họp, thời lượng), filter phòng ban
//   GET /admin/dashboard/department-ranking  → Top 5 phòng ban nhiều cuộc họp nhất
//   GET /admin/dashboard/longest-meetings    → Top 5 cuộc họp dài nhất, filter phòng ban
//   GET /admin/dashboard/staff-distribution  → tỷ trọng số User theo từng phòng ban
