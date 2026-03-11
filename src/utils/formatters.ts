import { format, formatDistanceToNow } from "date-fns";
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
export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), {
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

// Cắt ngắn text và thêm "..."
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}
