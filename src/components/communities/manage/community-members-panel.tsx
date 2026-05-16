import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
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
  email: string
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
  ADMIN: "bg-[#e7f3ff] text-[#1877f2]",
  MODERATOR: "bg-[#fff4de] text-[#8a5200]",
  MEMBER: "bg-[#e4e6eb] text-[#050505]",
  STUDENT: "bg-[#e4e6eb] text-[#050505]",
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
  title = "Danh sách thành viên",
  description,
}: {
  members: CommunityMemberItem[]
  targetType?: "GROUP" | "CLUB" | "COURSE"
  slugId?: string
  managerId?: string | null
  title?: string
  description?: string
}) {
  const resolvedDescription =
    description ?? `Tổng ${members.length} thành viên đang tham gia không gian này.`

  return (
    <Card className={`${manageSurface} gap-0 py-0`}>
      <CardHeader className={manageHeader}>
        <CardTitle className="text-lg font-bold text-[#050505]">
          {title}
        </CardTitle>
        <CardDescription className="text-[#65676b]">
          {resolvedDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className={manageContent}>
        {members.length > 0 ? (
          <div className="divide-y divide-[#e4e6eb]">
            {members.map((member) => (
              <article
                key={member.userId}
                className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-12 ring-2 ring-white">
                    <AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName} />
                    <AvatarFallback className="bg-[#e7f3ff] font-semibold text-[#1877f2]">
                      {getInitials(member.displayName) || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-[#050505]">
                        {member.displayName}
                      </h3>
                      <Badge className={roleBadgeClass[member.role]} variant="secondary">
                        {roleLabels[member.role]}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-[#65676b]">
                      {member.studentId ?? "Chưa có mã sinh viên"} · {member.email}
                    </p>
                    <time className="mt-1 block text-xs text-[#65676b] sm:hidden">
                      Tham gia {member.joinedAt.toLocaleDateString("vi-VN")}
                    </time>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:items-end">
                  <time className="hidden text-xs text-[#65676b] sm:block sm:text-right">
                    Tham gia {member.joinedAt.toLocaleDateString("vi-VN")}
                  </time>
                  {targetType && slugId ? (
                    <CommunityMemberActions
                      targetType={targetType}
                      slugId={slugId}
                      memberId={member.userId}
                      role={member.role}
                      canChangeRole={
                        targetType !== "COURSE" && member.userId !== managerId
                      }
                      canRemove={member.userId !== managerId}
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
