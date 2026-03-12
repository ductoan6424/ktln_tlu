"use client"

import { MessageFilterTabs } from "@/components/messages/message-filter-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { SquarePen } from "lucide-react"
import { IconButton } from "@/components/shared/icon-button"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface ConversationListProps {
  children: React.ReactNode
  className?: string
}

export function ConversationList({
  children,
  className,
}: ConversationListProps) {
  const [activeTab, setActiveTab] = useState("all")

  return (
    <aside
      className={cn(
        "w-80 border-r border-border flex flex-col bg-card shrink-0",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 space-y-4 shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Tin nhắn</h2>
          <IconButton icon={SquarePen} size="sm" ariaLabel="Tin nhắn mới" />
        </div>
        <MessageFilterTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Danh sách */}
      <div className="flex-1 overflow-y-auto">{children}</div>

      {/* Status */}
      <div className="p-4 border-t border-border flex items-center gap-3 shrink-0">
        <div className="size-9 bg-muted rounded-full flex items-center justify-center">
          <div className="size-2.5 bg-green-500 rounded-full" />
        </div>
        <div>
          <p className="text-xs font-semibold">Trực tuyến</p>
          <p className="text-[10px] text-muted-foreground">Hiển thị với sinh viên</p>
        </div>
      </div>
    </aside>
  )
}

export function ConversationListSkeleton() {
  return (
    <aside className="w-80 border-r border-border flex flex-col bg-card">
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 px-4 py-4">
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
