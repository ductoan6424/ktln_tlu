"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal, UserMinus, Users } from "lucide-react"

import { unfollowUser } from "@/actions/follows"
import type { ConnectionPreviewItem } from "@/app/(main)/profile/profile-page-data"
import { EmptyState } from "@/components/shared/empty-state"
import { SearchInput } from "@/components/shared/search-input"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { notifyContactFollowChanged } from "@/lib/contacts/events"

interface ProfileConnectionsListProps {
  profileName: string
  totalCount: number
  connections: ConnectionPreviewItem[]
}

export function filterProfileConnections(
  connections: ConnectionPreviewItem[],
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return connections
  }

  return connections.filter((connection) =>
    [
      connection.displayName,
      connection.username,
      connection.studentId,
    ].some((value) => value?.toLowerCase().includes(normalizedQuery))
  )
}

export function ProfileConnectionsList({
  profileName,
  totalCount,
  connections,
}: ProfileConnectionsListProps) {
  const { refresh } = useRouter()
  const { toast } = useToast()
  const [query, setQuery] = useState("")
  const [visibleConnections, setVisibleConnections] = useState(connections)
  const [isPending, startTransition] = useTransition()
  const filteredConnections = useMemo(
    () => filterProfileConnections(visibleConnections, query),
    [visibleConnections, query]
  )
  const visibleCount = visibleConnections.length

  const handleUnfollow = (connection: ConnectionPreviewItem) => {
    if (isPending) return

    startTransition(async () => {
      const result = await unfollowUser(connection.userId)

      if (!result.success) {
        toast({
          title: "Không thể bỏ theo dõi",
          description:
            result.error ?? "Đã có lỗi xảy ra. Vui lòng thử lại.",
          variant: "destructive",
        })
        return
      }

      setVisibleConnections((currentConnections) =>
        currentConnections.filter((item) => item.userId !== connection.userId)
      )
      notifyContactFollowChanged({
        userId: connection.userId,
        isFollowing: false,
        isMutual: false,
      })
      toast({
        description: `Đã bỏ theo dõi ${connection.displayName}.`,
      })
      refresh()
    })
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">
            Kết nối của {profileName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {visibleCount || totalCount} kết nối
          </p>
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Tìm kiếm kết nối"
          className="w-full sm:max-w-xs"
        />
      </div>

      <Card>
        <CardContent className="p-5">
          {visibleConnections.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Chưa có kết nối nào"
              description="Danh sách kết nối sẽ hiển thị tại đây khi có bạn bè."
            />
          ) : filteredConnections.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Không tìm thấy kết nối"
              description="Thử tìm bằng tên, username hoặc mã sinh viên khác."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredConnections.map((connection) => (
                <div
                  key={connection.userId}
                  className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-3 transition-colors hover:bg-muted/60"
                >
                  <Link
                    href={`/profile/${connection.userId}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <UserAvatar
                      src={connection.avatarUrl ?? undefined}
                      name={connection.displayName}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {connection.displayName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {connection.studentId ??
                          (connection.username ? `@${connection.username}` : "Chưa có thông tin")}
                      </p>
                    </div>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Mở tuỳ chọn liên hệ"
                          className="shrink-0 rounded-full"
                          disabled={isPending}
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-40">
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => handleUnfollow(connection)}
                      >
                        <UserMinus className="size-4" />
                        Bỏ theo dõi
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
