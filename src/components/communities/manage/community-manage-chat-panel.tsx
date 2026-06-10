import Link from "next/link"
import { MessageCircle, Send, Settings } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  manageHeader,
  managePrimaryButton,
  manageSoftItem,
  manageSurface,
} from "@/components/communities/manage/manage-ui"

type CommunityManageChatPanelProps = {
  chatEnabled: boolean
  chatMode: "OPEN" | "ADMINS_ONLY" | "READ_ONLY"
  canSend: boolean
  conversationId?: string | null
  conversationError?: string | null
  settingsHref: string
}

function chatModeLabel(value: CommunityManageChatPanelProps["chatMode"]) {
  if (value === "ADMINS_ONLY") return "Chỉ quản trị viên"
  if (value === "READ_ONLY") return "Chỉ đọc"
  return "Mọi thành viên"
}

export function CommunityManageChatPanel({
  chatEnabled,
  chatMode,
  canSend,
  conversationId,
  conversationError,
  settingsHref,
}: CommunityManageChatPanelProps) {
  const canOpenChat = chatEnabled && Boolean(conversationId)

  return (
    <Card className={`${manageSurface} gap-0 py-0`}>
      <CardHeader className={manageHeader}>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageCircle className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg font-bold text-foreground">
              Chat cộng đồng
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Theo dõi trạng thái phòng chat và mở hội thoại trong trang Tin nhắn.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <div className={manageSoftItem}>
          <p className="text-sm font-semibold text-foreground">Trạng thái chat</p>
          <Badge
            className={chatEnabled ? "mt-2 bg-primary/10 text-primary" : "mt-2"}
            variant={chatEnabled ? "default" : "secondary"}
          >
            {chatEnabled ? chatModeLabel(chatMode) : "Đang tắt"}
          </Badge>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {chatEnabled
              ? "Phòng chat đang sẵn sàng cho thành viên có quyền truy cập."
              : "Bật chat trong tab Cài đặt để tạo và sử dụng phòng chat."}
          </p>
        </div>

        <div className={manageSoftItem}>
          <p className="text-sm font-semibold text-foreground">Quyền gửi tin</p>
          <Badge
            className={canSend ? "mt-2 bg-primary/10 text-primary" : "mt-2"}
            variant={canSend ? "default" : "secondary"}
          >
            {canSend ? "Có thể gửi tin" : "Chỉ xem"}
          </Badge>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {canSend
              ? "Bạn có thể gửi tin trong phòng chat này."
              : "Chế độ hiện tại không cho tài khoản này gửi tin."}
          </p>
        </div>

        {chatEnabled && !conversationId ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground sm:col-span-2">
            {conversationError ?? "Không thể mở phòng chat lúc này."}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="grid grid-cols-1 gap-2 border-t border-border bg-muted/40 sm:flex sm:justify-end">
        <Button
          variant="outline"
          nativeButton={false}
          className="w-full gap-2 sm:w-auto"
          render={<Link href={settingsHref} />}
        >
          <Settings className="size-4" aria-hidden="true" />
          Cài đặt chat
        </Button>
        {canOpenChat ? (
          <Button
            nativeButton={false}
            className={`${managePrimaryButton} w-full gap-2 sm:w-auto`}
            render={<Link href={`/messages?conversation=${encodeURIComponent(conversationId!)}`} />}
          >
            <Send className="size-4" aria-hidden="true" />
            Mở trong Tin nhắn
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}
