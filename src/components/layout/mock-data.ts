

import type { LucideIcon } from "lucide-react"
import { Heart, MessageCircle, UserPlus, Share2, Calendar, Image, ThumbsUp } from "lucide-react"

export interface GroupData {
  id: string
  name: string
  memberCount: number
  href: string
}

export const mockGroups: GroupData[] = [
  { id: "1", name: "CLB Thiết kế", memberCount: 120, href: "/clubs/design-club" },
  { id: "2", name: "Nhóm Công nghệ", memberCount: 85, href: "/groups/tech-group" },
  { id: "3", name: "CLB Tiếng Anh", memberCount: 200, href: "/clubs/english-club" },
  { id: "4", name: "Nhóm Âm nhạc", memberCount: 45, href: "/groups/music" },
]

export interface NotificationData {
  id: string
  type: "like" | "comment" | "friend_request" | "share" | "event" | "photo" | "system"
  icon: LucideIcon
  iconColor: string
  iconBg: string
  title: string
  description: string
  time: string
  isUnread: boolean
  actionUrl?: string
}

export interface MessageData {
  id: string
  avatar?: string
  name: string
  lastMessage: string
  time: string
  unreadCount: number
  isActive?: boolean
  status: "online" | "offline" | "away"
  isGroup?: boolean
}

// Mock Notifications
export const mockNotifications: NotificationData[] = [
  {
    id: "1",
    type: "like",
    icon: Heart,
    iconColor: "text-official",
    iconBg: "bg-official-soft",
    title: "Nguyễn Văn A thích bài viết của bạn",
    description: '"Tuyệt vời quá! Chúc mừng bạn..."',
    time: "2 phút trước",
    isUnread: true,
    actionUrl: "/feed/post-1",
  },
  {
    id: "2",
    type: "comment",
    icon: MessageCircle,
    iconColor: "text-info",
    iconBg: "bg-info/10",
    title: "Trần Thị B bình luận về bài viết của bạn",
    description: '"Cảm ơn bạn đã chia sẻ thông tin này!"',
    time: "15 phút trước",
    isUnread: true,
    actionUrl: "/feed/post-2",
  },
  {
    id: "3",
    type: "friend_request",
    icon: UserPlus,
    iconColor: "text-success",
    iconBg: "bg-success-soft",
    title: "Lê Văn C muốn kết bạn với bạn",
    description: "12 bạn chung",
    time: "1 giờ trước",
    isUnread: true,
    actionUrl: "/friends/requests",
  },
  {
    id: "4",
    type: "event",
    icon: Calendar,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Sự kiện sắp diễn ra: Hội thảo Công nghệ 2024",
    description: "Ngày mai lúc 9:00",
    time: "2 giờ trước",
    isUnread: false,
    actionUrl: "/events/123",
  },
  {
    id: "5",
    type: "photo",
    icon: Image,
    iconColor: "text-info",
    iconBg: "bg-info/10",
    title: "Phạm Thị D đã thêm ảnh mới",
    description: '"Kỷ niệm ngày sinh nhật"',
    time: "3 giờ trước",
    isUnread: false,
    actionUrl: "/photos/456",
  },
  {
    id: "6",
    type: "share",
    icon: Share2,
    iconColor: "text-warning",
    iconBg: "bg-warning-soft",
    title: "Hoàng Văn E đã chia sẻ bài viết của bạn",
    description: "đến nhóm Công nghệ Thông Tin",
    time: "5 giờ trước",
    isUnread: false,
    actionUrl: "/feed/post-3",
  },
  {
    id: "7",
    type: "system",
    icon: ThumbsUp,
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted",
    title: "Chào mừng bạn đến với TLU Community!",
    description: "Cảm ơn bạn đã tham gia cùng chúng tôi",
    time: "1 ngày trước",
    isUnread: false,
    actionUrl: "/welcome",
  },
]

// Mock Messages
export const mockMessages: MessageData[] = [
  {
    id: "1",
    avatar: "https://i.pravatar.cc/150?img=1",
    name: "Nguyễn Văn A",
    lastMessage: "Chiều nay bạn rảnh không?",
    time: "2 phút",
    unreadCount: 2,
    status: "online",
  },
  {
    id: "2",
    avatar: "https://i.pravatar.cc/150?img=2",
    name: "Trần Thị B",
    lastMessage: "Cảm ơn bạn nhé!",
    time: "15 phút",
    unreadCount: 1,
    status: "away",
  },
  {
    id: "3",
    avatar: "https://i.pravatar.cc/150?img=3",
    name: "Lê Văn C",
    lastMessage: "Đã gửi file cho bạn rồi đấy",
    time: "1 giờ",
    unreadCount: 0,
    status: "offline",
  },
  {
    id: "4",
    avatar: "https://i.pravatar.cc/150?img=4",
    name: "Phạm Thị D",
    lastMessage: "Hẹn gặp bạn vào thứ 7 nhé!",
    time: "2 giờ",
    unreadCount: 0,
    status: "online",
  },
  {
    id: "5",
    avatar: "https://i.pravatar.cc/150?img=5",
    name: "Hoàng Văn E",
    lastMessage: "Bài viết hay lắm, like mạnh!",
    time: "3 giờ",
    unreadCount: 0,
    status: "offline",
  },
  {
    id: "6",
    name: "Nhóm Công nghệ",
    lastMessage: "Tuấn: Ai muốn tham gia workshop không?",
    time: "5 giờ",
    unreadCount: 5,
    status: "offline",
    isGroup: true,
  },
]

// Mock Active Friends
export interface ActiveFriend {
  id: string
  name: string
  avatar?: string
  status: "online" | "offline" | "away"
  source?: "friend" | "conversation" | "follow"
  sourceIndex?: number
}

export const mockActiveFriends: ActiveFriend[] = [
  { id: "1", name: "Nguyễn Văn An", status: "online" },
  { id: "2", name: "Trần Thị B", status: "online" },
  { id: "3", name: "Lê Văn C", status: "away" },
  { id: "4", name: "Phạm Hoàng Nam", status: "online" },
  { id: "5", name: "Đỗ Minh Tuấn", status: "online" },
  { id: "6", name: "Bùi Thu Hà", status: "offline" },
  { id: "7", name: "Ngô Đức Minh", status: "online" },
  { id: "8", name: "Trịnh Thanh Hà", status: "online" },
  { id: "9", name: "Vũ Khánh Linh", status: "away" },
  { id: "10", name: "Đặng Quang Minh", status: "online" },
  { id: "11", name: "Hoàng Thuỳ Dung", status: "offline" },
]
