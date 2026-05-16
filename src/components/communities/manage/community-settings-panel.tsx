import { FileText, Flag, UserCheck, Users, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CommunitySettingsForm } from "@/components/communities/manage/community-settings-form"
import {
  manageHeader,
  manageSoftItem,
  manageSurface,
} from "@/components/communities/manage/manage-ui"

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

type StatItem = {
  label: string
  value: number
  icon: LucideIcon
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
  const stats: StatItem[] = [
    { label: "Thành viên", value: memberCount, icon: Users },
    { label: "Yêu cầu chờ", value: requestCount, icon: UserCheck },
    { label: "Bài chờ duyệt", value: pendingPostCount, icon: FileText },
    { label: "Báo cáo mở", value: reportCount, icon: Flag },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <Card key={stat.label} className={`${manageSurface} gap-2 py-4`}>
              <CardContent className="flex items-center gap-3 px-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e7f3ff] text-[#1877f2]">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-[#65676b]">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-[#050505]">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
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

      <Card className={`${manageSurface} gap-0 py-0`}>
        <CardHeader className={manageHeader}>
          <CardTitle className="text-lg font-bold text-[#050505]">
            Cài đặt hiện tại
          </CardTitle>
          <CardDescription className="text-[#65676b]">
            Tổng quan nhanh các cấu hình đang áp dụng cho không gian này.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <div className={manageSoftItem}>
            <p className="text-sm font-semibold text-[#050505]">Hiển thị</p>
            <Badge className="mt-2 bg-[#e4e6eb] text-[#050505]" variant="secondary">
              {visibility === "PRIVATE" ? "Riêng tư" : "Công khai"}
            </Badge>
          </div>
          <div className={manageSoftItem}>
            <p className="text-sm font-semibold text-[#050505]">Duyệt bài viết</p>
            <Badge
              className={
                requirePostApproval
                  ? "mt-2 bg-[#e7f3ff] text-[#1877f2]"
                  : "mt-2 bg-[#e4e6eb] text-[#050505]"
              }
              variant={requirePostApproval ? "default" : "secondary"}
            >
              {requirePostApproval ? "Đang bật" : "Không yêu cầu"}
            </Badge>
          </div>
          <div className={manageSoftItem}>
            <p className="text-sm font-semibold text-[#050505]">Chat</p>
            <Badge
              className={
                chatEnabled
                  ? "mt-2 bg-[#e7f3ff] text-[#1877f2]"
                  : "mt-2 bg-[#e4e6eb] text-[#050505]"
              }
              variant={chatEnabled ? "default" : "secondary"}
            >
              {chatEnabled ? chatModeLabel(chatMode) : "Đang tắt"}
            </Badge>
          </div>
          <div className={manageSoftItem}>
            <p className="text-sm font-semibold text-[#050505]">
              Lời mời thành viên
            </p>
            <Badge
              className={
                memberInviteEnabled
                  ? "mt-2 bg-[#e7f3ff] text-[#1877f2]"
                  : "mt-2 bg-[#e4e6eb] text-[#050505]"
              }
              variant={memberInviteEnabled ? "default" : "secondary"}
            >
              {memberInviteEnabled ? "Thành viên được mời" : "Chỉ quản trị viên"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
