import { Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CommunityInviteForm } from "@/components/communities/manage/community-invite-form"
import { CommunityInviteActions } from "@/components/communities/manage/community-invite-actions"
import {
  manageContent,
  manageEmpty,
  manageHeader,
  manageItem,
  manageSurface,
} from "@/components/communities/manage/manage-ui"

type CommunityInviteItem = {
  id: string
  inviteeName: string
  inviterName: string
  expiresAt: Date
  createdAt: Date
}

export function CommunityInvitesPanel({
  type,
  slugId,
  invites,
}: {
  type: "GROUP" | "CLUB"
  slugId: string
  invites: CommunityInviteItem[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <CommunityInviteForm type={type} slugId={slugId} />

      <Card className={`${manageSurface} gap-0 py-0`}>
        <CardHeader className={manageHeader}>
          <CardTitle className="text-lg font-bold text-foreground">
            Lời mời đang chờ
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Theo dõi các lời mời tham gia chưa được phản hồi.
          </CardDescription>
        </CardHeader>

        <CardContent className={manageContent}>
          {invites.length > 0 ? (
            <div className="flex flex-col gap-3">
              {invites.map((invite) => (
                <article key={invite.id} className={manageItem}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">
                        {invite.inviteeName}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Được mời bởi {invite.inviterName}
                      </p>
                    </div>
                    <Badge variant="warning">
                      <Clock data-icon="inline-start" />
                      Đang chờ
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Gửi ngày {invite.createdAt.toLocaleDateString("vi-VN")} · hết hạn{" "}
                    {invite.expiresAt.toLocaleDateString("vi-VN")}
                  </p>
                  <CommunityInviteActions type={type} slugId={slugId} inviteId={invite.id} />
                </article>
              ))}
            </div>
          ) : (
            <p className={manageEmpty}>Chưa có lời mời nào đang chờ.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
