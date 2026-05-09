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

type CommunityMemberItem = {
  userId: string
  displayName: string
  avatarUrl: string | null
  email: string
  studentId: string | null
  role: "ADMIN" | "MODERATOR" | "MEMBER"
  joinedAt: Date
}

const roleLabels = {
  ADMIN: "Quản trị viên",
  MODERATOR: "Kiểm duyệt",
  MEMBER: "Thành viên",
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
}: {
  members: CommunityMemberItem[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Danh sách thành viên</CardTitle>
        <CardDescription>
          Tổng {members.length} thành viên đang tham gia không gian này.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {members.length > 0 ? (
          <div className="flex flex-col gap-3">
            {members.map((member) => (
              <article
                key={member.userId}
                className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName} />
                    <AvatarFallback>{getInitials(member.displayName) || "U"}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{member.displayName}</h3>
                      <Badge
                        variant={member.role === "ADMIN" ? "default" : "secondary"}
                      >
                        {roleLabels[member.role]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {member.studentId ?? "Chưa có mã sinh viên"} · {member.email}
                    </p>
                  </div>
                </div>

                <time className="text-xs text-muted-foreground sm:text-right">
                  Tham gia {member.joinedAt.toLocaleDateString("vi-VN")}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Chưa có thành viên nào trong không gian này.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
