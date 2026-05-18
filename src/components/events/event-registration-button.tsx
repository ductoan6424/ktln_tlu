"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import {
  cancelEventRegistration,
  registerForEvent,
} from "@/actions/events"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface EventRegistrationButtonProps {
  eventId: string
  initialRegistered: boolean
  disabled?: boolean
  full?: boolean
  past?: boolean
}

export function EventRegistrationButton({
  eventId,
  initialRegistered,
  disabled = false,
  full = false,
  past = false,
}: EventRegistrationButtonProps) {
  const [isRegistered, setIsRegistered] = useState(initialRegistered)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleRegistrationToggle() {
    startTransition(async () => {
      const result = isRegistered
        ? await cancelEventRegistration(eventId)
        : await registerForEvent(eventId)

      if (!result.success) {
        toast({
          title: "Không thể cập nhật đăng ký",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      setIsRegistered(result.data?.registered ?? false)
      toast({
        title: result.data?.registered ? "Đã đăng ký sự kiện" : "Đã hủy đăng ký",
        description: result.data?.registered
          ? "Sự kiện đã được thêm vào danh sách tham gia của bạn."
          : "Bạn có thể đăng ký lại nếu sự kiện còn mở.",
      })
    })
  }

  const isDisabled = isPending || past || (!isRegistered && (disabled || full))

  return (
    <Button
      size="sm"
      variant={isRegistered ? "outline" : "default"}
      disabled={isDisabled}
      onClick={handleRegistrationToggle}
      className="text-xs font-bold"
    >
      {isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
      {past ? "Đã kết thúc" : full && !isRegistered ? "Đã đầy" : isRegistered ? "Hủy tham gia" : "Tham gia"}
    </Button>
  )
}
