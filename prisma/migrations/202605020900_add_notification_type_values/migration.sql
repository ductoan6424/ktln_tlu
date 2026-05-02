-- Thêm các loại NotificationType mới phục vụ in-app notifications
-- Tách riêng khỏi migration thay đổi cấu trúc để tránh lỗi PostgreSQL khi
-- thêm enum value và dùng ngay trong cùng transaction.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMENT_REPLY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FOLLOW';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FRIENDSHIP';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REPOST';
