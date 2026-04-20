import type {
  ProfileStats,
  ProfileSummary,
} from "@/app/(main)/profile/profile-page-data"
import { SectionHeader } from "@/components/shared/section-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateShort, formatNumber } from "@/utils/formatters"

interface ProfileOverviewCardProps {
  profile: ProfileSummary
  stats: ProfileStats
  className?: string
}

const ROLE_LABELS: Record<ProfileSummary["role"], string> = {
  ADMIN: "Quản trị viên",
  CLUB_ADMIN: "Quản trị CLB",
  LECTURER: "Giảng viên",
  STUDENT: "Sinh viên",
}

function OverviewRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}

export function ProfileOverviewCard({
  profile,
  stats,
  className,
}: ProfileOverviewCardProps) {
  return (
    <Card className={className}>
      <CardContent className="space-y-4 p-5">
        <SectionHeader title="Tổng quan" />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/60 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Bài viết
            </p>
            <p className="mt-1 text-xl font-bold">{formatNumber(stats.postsCount)}</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Kết nối
            </p>
            <p className="mt-1 text-xl font-bold">{formatNumber(stats.connectionsCount)}</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Câu lạc bộ
            </p>
            <p className="mt-1 text-xl font-bold">{formatNumber(stats.clubsCount)}</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Nhóm
            </p>
            <p className="mt-1 text-xl font-bold">{formatNumber(stats.groupsCount)}</p>
          </div>
        </div>

        <div className="space-y-3">
          <OverviewRow
            label="Vai trò"
            value={ROLE_LABELS[profile.role] ?? profile.role}
          />
          {profile.studentId && (
            <OverviewRow label="Mã sinh viên" value={profile.studentId} />
          )}
          {profile.major && (
            <OverviewRow label="Ngành" value={profile.major} />
          )}
          {profile.year && (
            <OverviewRow label="Khóa" value={`K${profile.year}`} />
          )}
          <OverviewRow
            label="Tham gia"
            value={formatDateShort(profile.createdAt)}
          />
        </div>

        <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Giới thiệu
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            {profile.bio?.trim() || "Chưa có phần giới thiệu."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProfileOverviewCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-24 rounded-lg" />
      </CardContent>
    </Card>
  )
}
