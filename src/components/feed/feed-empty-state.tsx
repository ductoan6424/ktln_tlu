"use client"

import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { FileText } from "lucide-react"

export function FeedEmptyState() {
  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <EmptyState
          icon={FileText}
          title="Chưa có bài viết nào"
          description="Hãy là người đầu tiên chia sẻ!"
        />
      </CardContent>
    </Card>
  )
}
