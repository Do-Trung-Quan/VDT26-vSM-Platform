// REST tóm tắt AI (Group G):
//   POST /meetings/:id/summary    → trigger sinh tóm tắt (tạo MeetingSummary status=PROCESSING, trả 202)
//   GET  /meetings/:id/summary    → lấy tóm tắt (trả 202 nếu PROCESSING, 200 + summary_text nếu COMPLETED)
