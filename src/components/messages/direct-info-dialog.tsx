"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ExternalLink, X } from "lucide-react"

import { getDirectConversationDetails } from "@/actions/chat"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { getBaseRoleLabel } from "@/lib/auth/base-role"
import { formatDateShort } from "@/utils/formatters"
import type { ChatDirectDetails } from "@/types/chat"

interface DirectInfoDialogProps {
  conversationId: string | null
  open: boolean
  isOnline?: boolean
  onOpenChange: (open: boolean) => void
}

interface DirectInfoPanelProps {
  details: ChatDirectDetails
  isOnline?: boolean
  onClose: () => void
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg px-2 py-2">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

export function DirectInfoSkeletonPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl lg:static lg:z-auto lg:h-full lg:w-80 lg:max-w-none lg:shrink-0 lg:shadow-none xl:w-[360px]">
      <header className="flex min-h-20 shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="ĐA�ng thA�ng tin cuộc trA� chuyện"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-4 flex h-12 items-center gap-4 px-2">
          <Skeleton className="size-5" />
          <Skeleton className="h-4 w-40" />
        </div>

        <section className="space-y-3 px-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-16 w-full" />
        </section>

        <section className="mt-6 space-y-3 px-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </section>
      </div>

      <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">
        <Skeleton className="h-9 w-20" />
      </footer>
    </aside>
  )
}

export function DirectInfoPanel({ details, isOnline = false, onClose }: DirectInfoPanelProps) {
  const peer = details.peer
  const profileRows = useMemo(
    () => [
      { label: "Vai trò", value: getBaseRoleLabel(peer.role) },
      ...(peer.studentId ? [{ label: "Mã sinh viên", value: peer.studentId }] : []),
      ...(peer.major ? [{ label: "Ngành", value: peer.major }] : []),
      ...(peer.year ? [{ label: "Khóa", value: `K${peer.year}` }] : []),
      { label: "Tham gia", value: formatDateShort(peer.createdAt) },
    ],
    [peer.createdAt, peer.major, peer.role, peer.studentId, peer.year],
  )

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl lg:static lg:z-auto lg:h-full lg:w-80 lg:max-w-none lg:shrink-0 lg:shadow-none xl:w-[360px]">
      <header className="flex min-h-20 shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            src={peer.avatarUrl ?? undefined}
            name={peer.displayName}
            size="lg"
            showStatus
            status={isOnline ? "online" : "offline"}
          />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{peer.displayName}</h2>
            {peer.username && (
              <p className="truncate text-xs text-muted-foreground">@{peer.username}</p>
            )}
            <p className="truncate text-xs text-muted-foreground">
              {isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Đóng thông tin cuộc trò chuyện"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Button
          variant="ghost"
          className="mb-4 h-12 w-full justify-start gap-4 px-2 text-left hover:bg-muted/70"
          render={<Link href={`/profile/${encodeURIComponent(peer.userId)}`} />}
        >
          <ExternalLink className="size-5 text-foreground" />
          <span className="text-[15px] font-semibold">Xem trang cá nhân</span>
        </Button>

        <section className="space-y-1">
          <div className="flex h-9 items-center px-2">
            <h3 className="text-base font-semibold">Thông tin cá nhân</h3>
          </div>
          {profileRows.map((row) => (
            <InfoRow key={row.label} label={row.label} value={row.value} />
          ))}
          <div className="rounded-lg px-2 py-2">
            <p className="mb-1 text-sm text-muted-foreground">Giới thiệu</p>
            <p className="text-sm leading-5 text-foreground">
              {peer.bio?.trim() || "Chưa có phần giới thiệu."}
            </p>
          </div>
        </section>

        <section className="mt-5 space-y-1">
          <div className="flex h-9 items-center px-2">
            <h3 className="text-base font-semibold">Cuộc trò chuyện</h3>
          </div>
          <InfoRow label="Loại" value="Trò chuyện 1-1" />
          <InfoRow label="Bắt đầu" value={formatDateShort(details.createdAt)} />
        </section>
      </div>

      <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="outline" onClick={onClose}>
          Đóng
        </Button>
      </footer>
    </aside>
  )
}

export function DirectInfoDialog({
  conversationId,
  open,
  isOnline = false,
  onOpenChange,
}: DirectInfoDialogProps) {
  const { toast } = useToast()
  const [details, setDetails] = useState<ChatDirectDetails | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !conversationId) {
      return
    }

    let isDisposed = false

    const loadDetails = async () => {
      setIsLoading(true)
      setLoadError(null)
      const result = await getDirectConversationDetails({ conversationId })

      if (isDisposed) {
        return
      }

      if (result.success && result.data) {
        setDetails(result.data)
      } else {
        setDetails(null)
        setLoadError(result.error ?? "Không thể tải thông tin cuộc trò chuyện.")
        toast({
          title: "Không thể tải thông tin",
          description: result.error ?? "Vui lòng thử lại.",
          variant: "destructive",
        })
      }

      setIsLoading(false)
    }

    void loadDetails()

    return () => {
      isDisposed = true
    }
  }, [conversationId, open, toast])

  const handleClose = () => {
    onOpenChange(false)
    setDetails(null)
    setLoadError(null)
    setIsLoading(false)
  }

  if (!open || !conversationId) {
    return null
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="fixed inset-0 z-40 size-auto rounded-none bg-background/60 p-0 backdrop-blur-sm hover:bg-background/60 lg:hidden"
        aria-label="Đóng thông tin cuộc trò chuyện"
        onClick={handleClose}
      />
      {isLoading || (!details && !loadError) ? (
        <DirectInfoSkeletonPanel onClose={handleClose} />
      ) : !details ? (
        <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl lg:static lg:z-auto lg:h-full lg:w-80 lg:max-w-none lg:shrink-0 lg:shadow-none xl:w-[360px]">
          <header className="flex h-16 shrink-0 items-start justify-between border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">Thông tin</h2>
              <p className="truncate text-xs text-muted-foreground">Không thể tải thông tin</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Đóng thông tin cuộc trò chuyện"
              onClick={handleClose}
            >
              <X className="size-4" />
            </Button>
          </header>
          <p className="px-5 py-8 text-sm text-muted-foreground">
            {loadError ?? "Không có thông tin để hiển thị."}
          </p>
        </aside>
      ) : (
        <DirectInfoPanel details={details} isOnline={isOnline} onClose={handleClose} />
      )}
    </>
  )
}
