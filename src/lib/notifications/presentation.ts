import {
  Bell,
  Heart,
  MessageCircle,
  Megaphone,
  Repeat,
  Share2,
  UserPlus,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { NotificationType } from "@prisma/client"

export type NotificationPresentation = {
  icon: LucideIcon
  iconColor: string
  iconBg: string
}

const DEFAULT_PRESENTATION: NotificationPresentation = {
  icon: Bell,
  iconColor: "text-muted-foreground",
  iconBg: "bg-muted",
}

const PRESENTATION_MAP: Partial<Record<NotificationType, NotificationPresentation>> = {
  FOLLOW: {
    icon: UserPlus,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-500/10",
  },
  FRIENDSHIP: {
    icon: Users,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-500/10",
  },
  COMMENT: {
    icon: MessageCircle,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-500/10",
  },
  COMMENT_REPLY: {
    icon: MessageCircle,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-500/10",
  },
  LIKE: {
    icon: Heart,
    iconColor: "text-rose-600",
    iconBg: "bg-rose-500/10",
  },
  REPOST: {
    icon: Repeat,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-500/10",
  },
  POST: {
    icon: Share2,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  MESSAGE: {
    icon: MessageCircle,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-500/10",
  },
  ANNOUNCEMENT: {
    icon: Megaphone,
    iconColor: "text-amber-700",
    iconBg: "bg-amber-500/15",
  },
}

export function getNotificationPresentation(type: NotificationType): NotificationPresentation {
  return PRESENTATION_MAP[type] ?? DEFAULT_PRESENTATION
}
