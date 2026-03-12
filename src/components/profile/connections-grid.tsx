import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface Connection {
  avatar?: string
  name: string
  href?: string
}

interface ConnectionsGridProps {
  connections: Connection[]
  totalCount: number
}

export function ConnectionsGrid({
  connections,
  totalCount,
}: ConnectionsGridProps) {
  const displayedCount = connections.length
  const remaining = totalCount - displayedCount

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold flex items-center gap-2">
            👥 Kết nối
          </h3>
          <Link
            href="/connections"
            className="text-xs font-bold text-primary hover:underline"
          >
            Xem tất cả
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          {connections.map((connection) => (
            <div key={connection.name} className="flex flex-col items-center gap-1 w-14">
              <UserAvatar
                src={connection.avatar}
                name={connection.name}
                size="lg"
              />
              <p className="text-[10px] text-center text-muted-foreground truncate w-full">
                {connection.name.split(" ").pop()}
              </p>
            </div>
          ))}
          {remaining > 0 && (
            <div className="flex flex-col items-center gap-1 w-14">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                +{remaining}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ConnectionsGridSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 w-14">
              <Skeleton className="size-12 rounded-full" />
              <Skeleton className="h-2.5 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
