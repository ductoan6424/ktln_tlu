"use client"

import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, ImageIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RichTextToolbarProps {
  onAction?: (action: string) => void
  className?: string
}

const TOOLBAR_ITEMS = [
  { icon: Bold, action: "bold", label: "In đậm" },
  { icon: Italic, action: "italic", label: "In nghiêng" },
  { icon: Underline, action: "underline", label: "Gạch chân" },
  { icon: List, action: "unordered-list", label: "Danh sách" },
  { icon: ListOrdered, action: "ordered-list", label: "Danh sách số" },
  { icon: LinkIcon, action: "link", label: "Liên kết" },
  { icon: ImageIcon, action: "image", label: "Hình ảnh" },
]

export function RichTextToolbar({
  onAction,
  className,
}: RichTextToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 p-2 border border-border rounded-t-lg bg-muted",
        className
      )}
    >
      {TOOLBAR_ITEMS.map((item) => (
        <button
          key={item.action}
          onClick={() => onAction?.(item.action)}
          className="p-2 rounded hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
          title={item.label}
        >
          <item.icon className="size-4" />
        </button>
      ))}
      <div className="flex-1" />
      <Button
        size="sm"
        variant="outline"
        onClick={() => onAction?.("ai-summarize")}
        className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/10"
      >
        <Sparkles className="size-4" />
        AI Tóm tắt
      </Button>
    </div>
  )
}
