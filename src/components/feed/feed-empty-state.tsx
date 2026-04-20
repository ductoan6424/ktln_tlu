"use client"

import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"

export function FeedEmptyState() {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12 px-4 gap-4">
        <div className="rounded-full bg-muted p-4">
          <FileText className="size-10 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Chưa có bài viết nào
          </p>
          <p className="text-xs text-muted-foreground">
            Hãy là người đầu tiên chia sẻ!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}