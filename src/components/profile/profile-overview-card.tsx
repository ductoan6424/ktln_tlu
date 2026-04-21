import type {
  ProfileStats,
  ProfileSummary,
} from "@/app/(main)/profile/profile-page-data"
import { SectionHeader } from "@/components/shared/section-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getBaseRoleLabel } from "@/lib/auth/base-role"
import { formatDateShort, formatNumber } from "@/utils/formatters"

interface ProfileOverviewCardProps {
  profile: ProfileSummary
  stats: ProfileStats
  className?: string
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
        <SectionHeader title="T\u1ed5ng quan" />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/60 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              B\u00e0i vi\u1ebft
            </p>
            <p className="mt-1 text-xl font-bold">{formatNumber(stats.postsCount)}</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              K\u1ebft n\u1ed1i
            </p>
            <p className="mt-1 text-xl font-bold">{formatNumber(stats.connectionsCount)}</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              C\u00e2u l\u1ea1c b\u1ed9
            </p>
            <p className="mt-1 text-xl font-bold">{formatNumber(stats.clubsCount)}</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Nh\u00f3m
            </p>
            <p className="mt-1 text-xl font-bold">{formatNumber(stats.groupsCount)}</p>
          </div>
        </div>

        <div className="space-y-3">
          <OverviewRow label="Vai tr\u00f2" value={getBaseRoleLabel(profile.role)} />
          {profile.studentId && (
            <OverviewRow label="M\u00e3 sinh vi\u00ean" value={profile.studentId} />
          )}
          {profile.major && (
            <OverviewRow label="Ng\u00e0nh" value={profile.major} />
          )}
          {profile.year && (
            <OverviewRow label="Kh\u00f3a" value={`K${profile.year}`} />
          )}
          <OverviewRow
            label="Tham gia"
            value={formatDateShort(profile.createdAt)}
          />
        </div>

        <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Gi\u1edbi thi\u1ec7u
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            {profile.bio?.trim() || "Ch\u01b0a c\u00f3 ph\u1ea7n gi\u1edbi thi\u1ec7u."}
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
