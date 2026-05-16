import type {
  ClubMembershipDto,
  GroupMembershipDto,
} from "@/app/(main)/profile/profile-page-data"
import { SectionHeader } from "@/components/shared/section-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateShort } from "@/utils/formatters"

interface ProfileClubGroupCardProps {
  clubs: ClubMembershipDto[]
  groups: GroupMembershipDto[]
  className?: string
}

function MembershipBlock({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      {children}
    </div>
  )
}

function EmptyMembershipState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
      Chưa tham gia {label}.
    </div>
  )
}

export function ProfileClubGroupCard({
  clubs,
  groups,
  className,
}: ProfileClubGroupCardProps) {
  return (
    <Card className={className}>
      <CardContent className="space-y-5 p-5">
        <SectionHeader title="CLB & nhóm" />

        <MembershipBlock title="Câu lạc bộ" count={clubs.length}>
          {clubs.length === 0 ? (
            <EmptyMembershipState label="câu lạc bộ nào" />
          ) : (
            <div className="space-y-3">
              {clubs.map((membership) => (
                <div
                  key={membership.clubId}
                  className="rounded-lg border border-border/60 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {membership.club.name}
                      </p>
                      {membership.club.description && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {membership.club.description}
                        </p>
                      )}
                    </div>
                    <StatusBadge variant="muted">{membership.role}</StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tham gia từ {formatDateShort(membership.joinedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </MembershipBlock>

        <MembershipBlock title="Nhóm học tập" count={groups.length}>
          {groups.length === 0 ? (
            <EmptyMembershipState label="nhóm nào" />
          ) : (
            <div className="space-y-3">
              {groups.map((membership) => (
                <div
                  key={membership.groupId}
                  className="rounded-lg border border-border/60 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {membership.group.name}
                      </p>
                      {membership.group.description && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {membership.group.description}
                        </p>
                      )}
                    </div>
                    <StatusBadge variant="muted">{membership.role}</StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tham gia từ {formatDateShort(membership.joinedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </MembershipBlock>
      </CardContent>
    </Card>
  )
}

export function ProfileClubGroupCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}
