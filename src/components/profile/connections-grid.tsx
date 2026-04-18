import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface Connection {
  userId?: string
  avatar?: string | null
  avatarUrl?: string | null
  name?: string
  displayName?: string
  username?: string | null
  studentId?: string | null
  href?: string
}

interface ConnectionsGridProps {
  connections: Connection[]
  totalCount: number
}

function resolveConnection(connection: Connection) {
  const name = connection.displayName ?? connection.name ?? "Ẩn danh"
  const avatar = connection.avatarUrl ?? connection.avatar ?? undefined
  const subtitle = connection.studentId ?? (connection.username ? `@${connection.username}` : null)

  return {
    avatar,
    href: connection.href ?? "/connections",
    name,
    subtitle,
  }
}

export function ConnectionsGrid({
  connections,
  totalCount,
}: ConnectionsGridProps) {
  const remaining = Math.max(totalCount - connections.length, 0)

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Kết nối</h3>
            <p className="text-xs text-muted-foreground" data-total-count={totalCount}>
              {totalCount} kết nối
            </p>
          </div>
          {totalCount > 0 && (
            <Link
              href="/connections"
              className="text-xs font-bold text-primary hover:underline"
            >
              Xem tất cả
            </Link>
          )}
        </div>

        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có kết nối nào.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {connections.map((connection) => {
              const item = resolveConnection(connection)

              return (
                <Link
                  key={`${item.name}-${item.subtitle ?? "connection"}`}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 transition-colors hover:bg-muted/60"
                >
                  <UserAvatar
                    src={item.avatar}
                    name={item.name}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    {item.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
            {remaining > 0 && (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-border px-3 py-2 text-sm font-semibold text-muted-foreground">
                +{remaining}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ConnectionsGridSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
