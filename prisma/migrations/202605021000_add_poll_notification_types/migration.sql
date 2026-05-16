-- Thêm các loại NotificationType cho tính năng Poll/Khảo sát
-- Tách riêng khỏi migration thay đổi cấu trúc để tránh lỗi PostgreSQL khi
-- thêm enum value và dùng ngay trong cùng transaction.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'POLL_VOTE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'POLL_CLOSED';
