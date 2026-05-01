import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Eye, BadgeCheck } from "lucide-react"
import {
  OFFICIAL_SCHOOL_AVATAR_URL,
  OFFICIAL_SCHOOL_DISPLAY_NAME,
} from "@/lib/config/announcements"

interface AnnouncementPreviewProps {
  title?: string
  content?: string
  audience?: "ALL" | "STUDENTS" | "FACULTY"
  pinToTop?: boolean
}

const AUDIENCE_LABEL: Record<NonNullable<AnnouncementPreviewProps["audience"]>, string> = {
  ALL: "Tất cả",
  STUDENTS: "Sinh viên",
  FACULTY: "Giảng viên",
}

export function AnnouncementPreview({
  title,
  content,
  audience = "ALL",
  pinToTop = false,
}: AnnouncementPreviewProps) {
  const hasContent = Boolean(title && title.trim()) || Boolean(content && content.trim())

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
        <Eye className="size-4" />
        Xem trước trên bảng tin
      </h3>

      <Card className="overflow-hidden relative">
        {pinToTop && (
          <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
        )}
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="relative size-10 shrink-0 rounded-full overflow-hidden border border-border bg-white flex items-center justify-center">
              <Image
                src={OFFICIAL_SCHOOL_AVATAR_URL}
                alt={OFFICIAL_SCHOOL_DISPLAY_NAME}
                width={40}
                height={40}
                className="object-contain p-1"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm">{OFFICIAL_SCHOOL_DISPLAY_NAME}</span>
                <BadgeCheck className="size-4 text-primary fill-primary stroke-primary-foreground" />
                <StatusBadge variant="primary" size="sm" className="ml-1">
                  Thông báo
                </StatusBadge>
              </div>
              <p className="text-xs text-muted-foreground">
                Vừa xong • Dành cho {AUDIENCE_LABEL[audience]}
              </p>
            </div>
          </div>

          {hasContent ? (
            <div className="mt-3 space-y-2">
              {title && (
                <h4 className="text-base font-bold leading-snug">{title}</h4>
              )}
              {content && (
                <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-6">
                  {content}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
