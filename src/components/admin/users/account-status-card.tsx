import { lockUserAccount, unlockUserAccount } from "@/actions/admin-users"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AdminUserAccountState } from "@/lib/admin/users/users-admin-data"

interface AccountStatusCardProps {
  userId: string
  displayName: string
  accountState: AdminUserAccountState
}

async function submitAccountModeration(formData: FormData) {
  "use server"

  const action = String(formData.get("action") ?? "")

  if (action === "unlock") {
    await unlockUserAccount(formData)
    return
  }

  await lockUserAccount(formData)
}

export function AccountStatusCard({
  userId,
  displayName,
  accountState,
}: AccountStatusCardProps) {
  const isLocked = accountState.status !== "ACTIVE"

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Trạng thái tài khoản</h2>
            <p className="text-sm text-muted-foreground">{displayName}</p>
          </div>
          <Badge variant={isLocked ? "destructive" : "secondary"}>{accountState.label}</Badge>
        </div>

        {accountState.reason ? (
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="font-medium text-foreground">Lý do</p>
            <p className="text-muted-foreground">{accountState.reason}</p>
          </div>
        ) : null}

        {accountState.lockedUntil ? (
          <p className="text-sm text-muted-foreground">
            Mở khóa dự kiến: {new Date(accountState.lockedUntil).toLocaleString("vi-VN")}
          </p>
        ) : null}

        <form action={submitAccountModeration} className="space-y-3">
          <input type="hidden" name="userId" value={userId} />
          <Textarea name="reason" placeholder="Lý do xử lý tài khoản" />
          <Input name="lockedUntil" type="datetime-local" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="action" value="TEMP_LOCKED" variant="outline">
              Khóa tạm thời
            </Button>
            <Button type="submit" name="action" value="LOCKED" variant="destructive">
              Khóa vĩnh viễn
            </Button>
            {isLocked ? (
              <Button type="submit" name="action" value="unlock" variant="secondary">
                Mở khóa
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
