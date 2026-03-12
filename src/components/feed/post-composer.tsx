"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/shared/user-avatar"
import { IconButton } from "@/components/shared/icon-button"
import { Skeleton } from "@/components/ui/skeleton"
import { ImageIcon, BarChart3, Video } from "lucide-react"
import { cn } from "@/lib/utils"

interface PostComposerProps {
  userAvatar?: string
  userName?: string
  variant?: "full" | "compact"
  className?: string
}

export function PostComposer({
  userAvatar,
  userName = "",
  variant = "full",
  className,
}: PostComposerProps) {
  if (variant === "compact") {
    return (
      <Card className={cn("shadow-sm", className)}>
        <CardContent className="p-4 flex items-center gap-4">
          <UserAvatar src={userAvatar} name={userName} size="md" />
          <div className="flex-1 bg-muted rounded-full px-4 py-2 text-muted-foreground text-sm cursor-text hover:bg-muted/80 transition-colors">
            Chia sẻ điều gì đó...
          </div>
          <IconButton icon={ImageIcon} ariaLabel="Thêm ảnh" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <UserAvatar
            src={userAvatar}
            name={userName}
            size="md"
            className="shrink-0"
          />
          <div className="flex-1">
            <Textarea
              placeholder="Chia sẻ điều gì đó với cộng đồng..."
              className="bg-muted border-border min-h-[100px] resize-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1 md:gap-2">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <ImageIcon className="size-4" />
                  <span className="hidden md:inline">Ảnh</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <BarChart3 className="size-4" />
                  <span className="hidden md:inline">Khảo sát</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Video className="size-4" />
                  <span className="hidden md:inline">Video</span>
                </Button>
              </div>
              <Button size="sm" className="font-medium">
                Đăng bài
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PostComposerSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex gap-4">
        <Skeleton className="size-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
