import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Eye } from "lucide-react"

interface AnnouncementPreviewProps {
  title?: string
  content?: string
  tag?: string
}

export function AnnouncementPreview({
  title = "Thông báo chưa có tiêu đề",
  content,
  tag = "Tin tức",
}: AnnouncementPreviewProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Eye className="size-5" />
        Xem trước
      </h3>
      <Card className="overflow-hidden">
        {/* Browser mock */}
        <div className="bg-foreground rounded-t-lg px-4 py-2.5 flex gap-1.5">
          <span className="size-3 rounded-full bg-destructive/80" />
          <span className="size-3 rounded-full bg-yellow-400/80" />
          <span className="size-3 rounded-full bg-green-500/80" />
          <span className="ml-4 text-[10px] text-muted-foreground/60 bg-muted/20 px-3 py-0.5 rounded">
            coengsinhvien.tlu.edu.vn/tin-tuc
          </span>
        </div>

        {/* Nội dung preview */}
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge variant="primary" size="sm">
              {tag}
            </StatusBadge>
            <span>Vừa xong • Bởi Quản trị viên</span>
          </div>
          <h2 className="text-2xl font-bold">{title}</h2>

          {/* AI tóm tắt */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
              ✨ AI tóm tắt nội dung
            </p>
            {content ? (
              <p className="text-sm text-muted-foreground">{content}</p>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-3/5" />
              </div>
            )}
          </div>

          {/* Placeholder nội dung */}
          {!content && (
            <div className="space-y-3 pt-4">
              <Skeleton className="h-4 w-full" />
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
