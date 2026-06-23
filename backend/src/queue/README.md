# Queue module

BullMQ trên nền Redis được dùng cho **hai vai trò** trong MP2:

1. **Job Queue** (xử lý nền, ngoài request HTTP): `transcription-batch` (worker bóc băng file Upload), `summary-generation` (worker gọi AI tóm tắt).
2. **EventBus** (domain event nội bộ giữa các module): `domain-events` — `meetings` publish, `notifications` subscribe để fan-out thông báo theo phòng ban.

Lý do dùng chung một hạ tầng (Redis + BullMQ) cho cả hai vai trò: tránh thêm một message broker riêng (Kafka/RabbitMQ) trong khi quy mô MP2 (modular monolith, một backend instance) không cần thiết — giảm độ phức tạp vận hành.
