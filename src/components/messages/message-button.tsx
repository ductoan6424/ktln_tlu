"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle } from "lucide-react"

import { openDirectConversation } from "@/actions/chat"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface MessageButtonProps {
  targetUserId: string
  variant?: "icon" | "text"
  className?: string
}

export function MessageButton({
  targetUserId,
  variant = "text",
  className,
}: MessageButtonProps) {
  const { push } = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const handleMessageButtonClick = () => {
    startTransition(async () => {
      const result = await openDirectConversation(targetUserId)

      if (!result.success || !result.data) {
        toast({
          title: "Không thể mở hội thoại",
          description: result.error ?? "Vui lòng thử lại sau.",
          variant: "destructive",
        })
        return
      }

      push(`/messages?conversation=${result.data.conversationId}`)
    })
  }

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleMessageButtonClick}
        disabled={isPending}
        aria-label="Nhắn tin"
        className={cn("size-9", className)}
      >
        <MessageCircle className="size-4" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleMessageButtonClick}
      disabled={isPending}
      className={cn("gap-1.5", className)}
    >
      <MessageCircle className="size-4" />
      Nhắn tin
    </Button>
  )
}
