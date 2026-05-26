"use client"

import { MessageFilterTabs } from "@/components/messages/message-filter-tabs"
import { IconButton } from "@/components/shared/icon-button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { SquarePen } from "lucide-react"
import { useState } from "react"

interface ConversationListProps {
  children: React.ReactNode
  className?: string
  activeTab?: string
  onTabChange?: (value: string) => void
  onCreateGroupClick?: () => void
}

export function ConversationList({
  children,
  className,
  activeTab: controlledActiveTab,
  onTabChange,
  onCreateGroupClick,
}: ConversationListProps) {
  const [internalActiveTab, setInternalActiveTab] = useState("all")
  const activeTab = controlledActiveTab ?? internalActiveTab
  const handleTabChange = onTabChange ?? setInternalActiveTab

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col overflow-hidden rounded-[1.25rem] border border-border/70 bg-card shadow-sm lg:w-80",
        className
      )}
    >
      <div className="shrink-0 space-y-4 border-b border-border/70 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              TLU Community
            </p>
            <h2 className="text-lg font-semibold text-brand-indigo">Tin nhắn nội bộ</h2>
          </div>
          <IconButton
            icon={SquarePen}
            size="sm"
            ariaLabel="Tạo nhóm chat"
            onClick={onCreateGroupClick}
          />
        </div>
        <MessageFilterTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      <div className="flex-1 overflow-y-auto">{children}</div>

      <div className="flex shrink-0 items-center gap-3 border-t border-border/70 bg-muted/30 p-4">
        <div className="flex size-9 items-center justify-center rounded-full bg-success-soft">
          <div className="size-2.5 rounded-full bg-success" />
        </div>
        <div>
          <p className="text-xs font-semibold text-brand-indigo">Trực tuyến</p>
          <p className="text-[10px] text-muted-foreground">Hiển thị với sinh viên</p>
        </div>
      </div>
    </aside>
  )
}

export function ConversationListSkeleton() {
  return (
    <aside className="flex w-full flex-col overflow-hidden rounded-[1.25rem] border border-border/70 bg-card shadow-sm lg:w-80">
      <div className="space-y-4 border-b border-border/70 p-4">
        <Skeleton className="h-6 w-24" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((slot) => (
            <Skeleton key={`tab-${slot}`} className="h-7 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-0">
        {[1, 2, 3, 4].map((slot) => (
          <div key={`item-${slot}`} className="flex gap-4 p-4">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
