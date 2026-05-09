import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CommunitySettingsForm } from "@/components/communities/manage/community-settings-form"

type CommunitySettingsPanelProps = {
  type: "GROUP" | "CLUB"
  slugId: string
  visibility: "PUBLIC" | "PRIVATE" | null
  requirePostApproval: boolean
  chatEnabled: boolean
  chatMode: "OPEN" | "ADMINS_ONLY" | "READ_ONLY"
  memberInviteEnabled: boolean
  memberCount: number
  requestCount: number
  pendingPostCount: number
  reportCount: number
}

function chatModeLabel(value: CommunitySettingsPanelProps["chatMode"]) {
  if (value === "ADMINS_ONLY") return "Chỉ quản trị viên"
  if (value === "READ_ONLY") return "Không cho gửi"
  return "Mọi thành viên"
}

export function CommunitySettingsPanel({
  type,
  slugId,
  visibility,
  requirePostApproval,
  chatEnabled,
  chatMode,
  memberInviteEnabled,
  memberCount,
  requestCount,
  pendingPostCount,
  reportCount,
}: CommunitySettingsPanelProps) {
  const stats = [
    { label: "Thành viên", value: memberCount },
    { label: "Yêu cầu chờ", value: requestCount },
    { label: "Bài chờ duyệt", value: pendingPostCount },
    { label: "Báo cáo mở", value: reportCount },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <CommunitySettingsForm
        type={type}
        slugId={slugId}
        visibility={visibility}
        requirePostApproval={requirePostApproval}
        chatEnabled={chatEnabled}
        chatMode={chatMode}
        memberInviteEnabled={memberInviteEnabled}
      />

      <Card>
        <CardHeader>
          <CardTitle>Cài đặt hiện tại</CardTitle>
          <CardDescription>
            Tổng quan nhanh các cấu hình đang áp dụng cho không gian này.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Hiển thị</p>
            <Badge className="mt-2" variant="secondary">
              {visibility === "PRIVATE" ? "Riêng tư" : "Công khai"}
            </Badge>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Duyệt bài viết</p>
            <Badge className="mt-2" variant={requirePostApproval ? "default" : "secondary"}>
              {requirePostApproval ? "Đang bật" : "Không yêu cầu"}
            </Badge>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Chat</p>
            <Badge className="mt-2" variant={chatEnabled ? "default" : "secondary"}>
              {chatEnabled ? chatModeLabel(chatMode) : "Đang tắt"}
            </Badge>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Lời mời thành viên</p>
            <Badge className="mt-2" variant={memberInviteEnabled ? "default" : "secondary"}>
              {memberInviteEnabled ? "Thành viên được mời" : "Chỉ quản trị viên"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
