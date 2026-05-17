import Link from "next/link"
import { WifiOff } from "lucide-react"

export const metadata = {
  title: "Mất kết nối - TLU Community",
  description: "Bạn hiện đang offline.",
}

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">Bạn đang offline</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Không có kết nối mạng. Một số trang đã được lưu cache có thể vẫn xem
        được, nhưng nội dung mới cần mạng để tải.
      </p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Thử lại
      </Link>
    </main>
  )
}
