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
  scopeLabels?: string[]
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
  scopeLabels,
  pinToTop = false,
}: AnnouncementPreviewProps) {
  const hasContent = Boolean(title && title.trim()) || Boolean(content && content.trim())

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
        <Eye className="size-4" />
        Xem trước trên bảng tin
      </h3>

      <Card className="relative overflow-hidden border-official/15 bg-card">
        {pinToTop && (
          <div className="official-marker absolute left-0 top-0 h-full w-1 bg-official" />
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
                <span className="text-sm font-semibold">{OFFICIAL_SCHOOL_DISPLAY_NAME}</span>
                <BadgeCheck className="size-4 text-primary fill-primary stroke-primary-foreground" />
                <StatusBadge variant="official" size="sm" className="ml-1">
                  Thông báo
                </StatusBadge>
              </div>
              <p className="text-xs text-muted-foreground">
                Vừa xong • Dành cho{" "}
                {(scopeLabels?.length ? scopeLabels : [AUDIENCE_LABEL[audience]]).join(", ")}
              </p>
            </div>
          </div>

          {hasContent ? (
            <div className="mt-3 space-y-2">
              {title && (
                <h4 className="text-base font-semibold leading-snug">{title}</h4>
              )}
              {content && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {content}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="size-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
