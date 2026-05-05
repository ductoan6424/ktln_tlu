import {
  format,
  formatDistance,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
} from "date-fns";
import { vi } from "date-fns/locale";

// Format ngày tháng dạng đầy đủ: "11 tháng 3, 2026"
export function formatDate(date: Date | string): string {
  return format(new Date(date), "d MMMM, yyyy", { locale: vi });
}

// Format ngày tháng dạng ngắn: "11/03/2026"
export function formatDateShort(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy");
}

// Format thời gian tương đối: "3 phút trước"
export function formatRelativeTime(
  date: Date | string,
  baseDate: Date | string = new Date(),
): string {
  return formatDistance(new Date(date), new Date(baseDate), {
    addSuffix: true,
    locale: vi,
  });
}

// Format số: 1000 -> "1K", 1000000 -> "1M"
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

// Format giờ ngắn cho tin nhắn: "14:30"
export function formatChatTime(date: Date | string): string {
  return format(new Date(date), "HH:mm");
}

// Format label ngày cho date divider giống Facebook:
// Hôm nay → "Hôm nay"
// Hôm qua → "Hôm qua"
// Trong tuần → "Thứ Hai" / "Thứ Ba" ...
// Năm nay → "11 tháng 3"
// Năm khác → "11 tháng 3, 2025"
export function formatChatDateLabel(date: Date | string): string {
  const d = new Date(date);

  if (isToday(d)) return "Hôm nay";
  if (isYesterday(d)) return "Hôm qua";
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, "EEEE", { locale: vi });
  if (isThisYear(d)) return format(d, "d MMMM", { locale: vi });

  return format(d, "d MMMM, yyyy", { locale: vi });
}

// Format đầy đủ cho hover tooltip: "14:30, 11 tháng 3, 2026"
export function formatChatFullTime(date: Date | string): string {
  return format(new Date(date), "HH:mm, d MMMM, yyyy", { locale: vi });
}

// Cắt ngắn text và thêm "..."
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}
