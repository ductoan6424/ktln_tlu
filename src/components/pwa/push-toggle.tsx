"use client"

import { useState } from "react"

import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { usePushSubscription } from "@/hooks/use-push-subscription"

// Toggle bật/tắt nhận push notification trên trình duyệt hiện tại.
// Khi bật: yêu cầu permission, subscribe và lưu vào server.
// Khi tắt: hủy subscription cả ở client lẫn server.
export function PushToggle() {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } =
    usePushSubscription()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  const disabled =
    !supported || loading || busy || permission === "denied"

  const handleChange = async (checked: boolean) => {
    setBusy(true)
    try {
      const result = checked ? await subscribe() : await unsubscribe()
      if (!result.ok) {
        toast({
          title: "Không thực hiện được",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: checked
            ? "Đã bật thông báo đẩy"
            : "Đã tắt thông báo đẩy",
        })
      }
    } finally {
      setBusy(false)
    }
  }

  let description =
    "Nhận thông báo trên trình duyệt khi có hoạt động mới (kể cả khi đóng tab)."
  if (!supported) {
    description = "Trình duyệt của bạn không hỗ trợ thông báo đẩy."
  } else if (permission === "denied") {
    description =
      "Bạn đã chặn thông báo cho trang này. Vui lòng bật lại trong cài đặt trình duyệt."
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Thông báo đẩy trên thiết bị này</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={subscribed}
        onCheckedChange={handleChange}
        disabled={disabled}
      />
    </div>
  )
}
