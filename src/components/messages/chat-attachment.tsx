import { cn } from "@/lib/utils"
import { IconButton } from "@/components/shared/icon-button"
import { FileText, Download } from "lucide-react"

interface ChatAttachmentProps {
  fileUrl: string
  fileName: string
  fileSize: string
  fileType: string
  className?: string
}

export function ChatAttachment({
  fileUrl,
  fileName,
  fileSize,
  fileType,
  className,
}: ChatAttachmentProps) {
  const compactFileType = formatFileType(fileType)

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noreferrer"
      download={fileName}
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
        <p className="text-xs text-muted-foreground truncate max-w-[170px]">
          {fileSize} • {compactFileType}
        </p>
      </div>
      <IconButton
        icon={Download}
        size="sm"
        ariaLabel="Tải xuống"
      />
    </a>
  )
}

function formatFileType(fileType: string) {
  if (fileType.length <= 36) {
    return fileType
  }

  return `${fileType.slice(0, 33)}...`
}
