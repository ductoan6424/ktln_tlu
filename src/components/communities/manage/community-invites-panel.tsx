import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CommunityInviteForm } from "@/components/communities/manage/community-invite-form"

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

      <Card>
        <CardHeader>
          <CardTitle>Lời mời đang chờ</CardTitle>
          <CardDescription>
            Theo dõi các lời mời tham gia chưa được phản hồi.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {invites.length > 0 ? (
            <div className="flex flex-col gap-3">
              {invites.map((invite) => (
                <article key={invite.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{invite.inviteeName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Được mời bởi {invite.inviterName}
                      </p>
                    </div>
                    <Badge variant="secondary">Đang chờ</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Gửi ngày {invite.createdAt.toLocaleDateString("vi-VN")} · hết hạn{" "}
                    {invite.expiresAt.toLocaleDateString("vi-VN")}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Chưa có lời mời nào đang chờ.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
