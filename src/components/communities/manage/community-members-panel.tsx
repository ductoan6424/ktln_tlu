import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CommunityMemberActions } from "@/components/communities/manage/community-member-actions"
import {
  manageContent,
  manageEmpty,
  manageHeader,
  manageSurface,
} from "@/components/communities/manage/manage-ui"

type CommunityMemberItem = {
  userId: string
  displayName: string
  avatarUrl: string | null
  email?: string | null
  studentId: string | null
  role: "ADMIN" | "MODERATOR" | "MEMBER" | "STUDENT"
  joinedAt: Date
}

const roleLabels = {
  ADMIN: "Quản trị viên",
  MODERATOR: "Kiểm duyệt",
  MEMBER: "Thành viên",
  STUDENT: "Sinh viên",
} as const

const roleBadgeClass = {
  ADMIN: "bg-primary/10 text-primary",
  MODERATOR: "bg-warning-soft text-warning",
  MEMBER: "bg-muted text-foreground",
  STUDENT: "bg-muted text-foreground",
} as const

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function CommunityMembersPanel({
  members,
  targetType,
  slugId,
  managerId,
  canManageActions = true,
  title = "Danh sách thành viên",
  description,
  countLabel = "thành viên",
}: {
  members: CommunityMemberItem[]
  targetType?: "GROUP" | "CLUB" | "COURSE"
  slugId?: string
  managerId?: string | null
  canManageActions?: boolean
  title?: string
  description?: string
  countLabel?: string
}) {
  const resolvedDescription =
    description ?? `Tổng ${members.length} thành viên đang tham gia không gian này.`

  return (
    <Card className={`${manageSurface} gap-0 py-0`}>
      <CardHeader className={manageHeader}>
        <CardTitle className="text-lg font-bold text-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {resolvedDescription}
        </CardDescription>
        <CardAction>
          <Badge variant="info">
            {members.length} {countLabel}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className={manageContent}>
        {members.length > 0 ? (
          <div className="divide-y divide-border">
            {members.map((member) => (
              <article
                key={member.userId}
                className="grid gap-3 py-4 transition-colors first:pt-0 last:pb-0 hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-10 ring-2 ring-card">
                    <AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName} />
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                      {getInitials(member.displayName) || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">
                        {member.displayName}
                      </h3>
                      <Badge className={roleBadgeClass[member.role]} variant="secondary">
                        {roleLabels[member.role]}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {member.studentId ?? "Chưa có mã sinh viên"} · {member.email}
                    </p>
                    <time className="mt-1 block text-xs text-muted-foreground sm:hidden">
                      Tham gia {member.joinedAt.toLocaleDateString("vi-VN")}
                    </time>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:items-end">
                  <time className="hidden text-xs text-muted-foreground sm:block sm:text-right">
                    Tham gia {member.joinedAt.toLocaleDateString("vi-VN")}
                  </time>
                  {targetType && slugId ? (
                    <CommunityMemberActions
                      targetType={targetType}
                      slugId={slugId}
                      memberId={member.userId}
                      role={member.role}
                      canChangeRole={
                        canManageActions &&
                        targetType !== "COURSE" &&
                        member.userId !== managerId
                      }
                      canRemove={canManageActions && member.userId !== managerId}
                    />
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={manageEmpty}>
            Chưa có thành viên nào trong không gian này.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
