"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import {
  Smartphone,
  Laptop,
  Globe,
  Trash2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react"

import {
  listMyPushDevices,
  revokePushDevice,
  type PushDeviceItem,
} from "@/actions/push"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { usePushSubscription } from "@/hooks/use-push-subscription"
import { formatRelativeTime } from "@/utils/formatters"
import { parseUserAgent } from "@/utils/user-agent"

// Quản lý trung tâm cho PWA / push notification trong tab Bảo mật:
// - Toggle bật/tắt thông báo trên thiết bị này.
// - Danh sách các trình duyệt đã đăng ký, kèm nút thu hồi.
// - Đánh dấu thiết bị hiện tại để user không tự xóa subscription đang hoạt động.
export function PushDevicesManager() {
  const {
    supported,
    permission,
    subscribed,
    loading: pushLoading,
    subscribe,
    unsubscribe,
    refresh: refreshPushState,
  } = usePushSubscription()
  const { toast } = useToast()

  const [devices, setDevices] = useState<PushDeviceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [pendingToggle, setPendingToggle] = useState(false)
  const [pendingRevoke, startRevokeTransition] = useTransition()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const loadDevices = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listMyPushDevices()
      if (result.success && result.data) {
        setDevices(result.data.devices)
      } else if (!result.success) {
        toast({
          title: "Không tải được thiết bị",
          description: result.error,
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Lấy endpoint hiện tại của browser để mark "Thiết bị này".
  const detectCurrentEndpoint = useCallback(async () => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setCurrentEndpoint(sub?.endpoint ?? null)
    } catch {
      setCurrentEndpoint(null)
    }
  }, [])

  useEffect(() => {
    loadDevices()
    detectCurrentEndpoint()
  }, [loadDevices, detectCurrentEndpoint])

  const handleToggle = async (checked: boolean) => {
    setPendingToggle(true)
    try {
      const result = checked ? await subscribe() : await unsubscribe()
      if (!result.ok) {
        toast({
          title: "Không thực hiện được",
          description: result.error,
          variant: "destructive",
        })
        return
      }
      toast({
        title: checked ? "Đã bật thông báo trên thiết bị này" : "Đã tắt thông báo trên thiết bị này",
      })
      await Promise.all([loadDevices(), detectCurrentEndpoint()])
    } finally {
      setPendingToggle(false)
    }
  }

  const handleRevoke = (device: PushDeviceItem) => {
    setConfirmId(device.id)
  }

  const confirmRevoke = () => {
    const id = confirmId
    if (!id) return
    const target = devices.find((d) => d.id === id)
    setConfirmId(null)
    if (!target) return

    setRevoking(id)
    startRevokeTransition(async () => {
      try {
        // Nếu thu hồi chính thiết bị hiện tại → unsubscribe ở browser luôn
        // để tránh sub bị "treo" phía client.
        if (target.endpoint === currentEndpoint) {
          await unsubscribe()
        } else {
          const result = await revokePushDevice(id)
          if (!result.success) {
            toast({
              title: "Không thu hồi được",
              description: result.error,
              variant: "destructive",
            })
            return
          }
        }
        toast({ title: "Đã thu hồi thiết bị" })
        await Promise.all([loadDevices(), detectCurrentEndpoint(), refreshPushState()])
      } finally {
        setRevoking(null)
      }
    })
  }

  const toggleDescription = useMemo(() => {
    if (!supported) return "Trình duyệt của bạn không hỗ trợ thông báo đẩy."
    if (permission === "denied")
      return "Bạn đã chặn thông báo cho trang này. Hãy bật lại trong cài đặt trình duyệt."
    return "Nhận thông báo đẩy trên thiết bị này, kể cả khi đóng tab trình duyệt."
  }, [supported, permission])

  const toggleDisabled =
    !supported ||
    pushLoading ||
    pendingToggle ||
    permission === "denied"

  return (
    <div className="space-y-6">
      {/* Toggle thiết bị này */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">Thông báo đẩy trên thiết bị này</p>
          <p className="text-xs text-muted-foreground">{toggleDescription}</p>
        </div>
        <Switch
          checked={subscribed}
          onCheckedChange={handleToggle}
          disabled={toggleDisabled}
          className="self-start sm:self-auto"
        />
      </div>

      <Separator />

      {/* Danh sách thiết bị */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Thiết bị đã đăng ký nhận thông báo</p>
            <p className="text-xs text-muted-foreground">
              Mỗi trình duyệt/PWA bật thông báo sẽ xuất hiện ở đây.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              loadDevices()
              detectCurrentEndpoint()
            }}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>

        {loading ? (
          <DeviceListSkeleton />
        ) : devices.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Chưa có thiết bị nào đăng ký nhận thông báo.
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {devices.map((device) => {
              const isCurrent = device.endpoint === currentEndpoint
              const isProcessing = revoking === device.id && pendingRevoke
              return (
                <DeviceRow
                  key={device.id}
                  device={device}
                  isCurrent={isCurrent}
                  isProcessing={isProcessing}
                  onRevoke={() => handleRevoke(device)}
                />
              )
            })}
          </ul>
        )}
      </div>

      <AlertDialog
        open={confirmId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thu hồi thiết bị này?</AlertDialogTitle>
            <AlertDialogDescription>
              Thiết bị sẽ ngừng nhận thông báo đẩy. Bạn có thể đăng ký lại bất cứ lúc nào trên thiết bị đó.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke}>Thu hồi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DeviceRow({
  device,
  isCurrent,
  isProcessing,
  onRevoke,
}: {
  device: PushDeviceItem
  isCurrent: boolean
  isProcessing: boolean
  onRevoke: () => void
}) {
  const parsed = parseUserAgent(device.userAgent)

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-9 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {renderDeviceIcon(parsed.os)}
        </span>
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium">{parsed.label}</p>
            {isCurrent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                <CheckCircle2 className="size-3" />
                Thiết bị này
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Đăng ký {formatRelativeTime(device.createdAt)} · Hoạt động cuối {formatRelativeTime(device.lastUsedAt)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="w-full justify-center text-destructive hover:text-destructive sm:w-auto"
        onClick={onRevoke}
        disabled={isProcessing}
      >
        <Trash2 className="size-3.5" />
        Thu hồi
      </Button>
    </li>
  )
}

function DeviceListSkeleton() {
  return (
    <ul className="divide-y rounded-md border">
      {[0, 1].map((i) => (
        <li key={`device-${i}`} className="flex items-center gap-3 px-4 py-3">
          <span className="size-9 flex-shrink-0 rounded-md bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <span className="block h-3.5 w-1/2 rounded bg-muted animate-pulse" />
            <span className="block h-3 w-1/3 rounded bg-muted animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function renderDeviceIcon(os: string) {
  if (/Android|iOS/.test(os)) return <Smartphone className="size-4" />
  if (/Windows|macOS|ChromeOS|Linux/.test(os)) return <Laptop className="size-4" />
  return <Globe className="size-4" />
}
