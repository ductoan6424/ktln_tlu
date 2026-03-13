import { cn } from "@/lib/utils"
import { IconButton } from "@/components/shared/icon-button"
import { FileText, Download } from "lucide-react"

interface ChatAttachmentProps {
  fileName: string
  fileSize: string
  fileType: string
  onDownload?: () => void
  className?: string
}

export function ChatAttachment({
  fileName,
  fileSize,
  fileType,
  onDownload,
  className,
}: ChatAttachmentProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-card p-3 rounded-xl border border-border hover:border-primary transition-colors cursor-pointer group",
        className
      )}
    >
      <div className="size-10 bg-destructive/10 text-destructive rounded-lg flex items-center justify-center shrink-0">
        <FileText className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
          {fileName}
        </p>
        <p className="text-xs text-muted-foreground">
          {fileSize} • {fileType}
        </p>
      </div>
      <IconButton
        icon={Download}
        size="sm"
        onClick={onDownload}
        ariaLabel="Tải xuống"
      />
    </div>
  )
}
