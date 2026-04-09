// src/app/(auth)/verify-email/page.tsx
import { verifyEmail } from "@/actions/auth"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams

  let status: "loading" | "success" | "error" = "loading"
  let message = ""

  if (!token) {
    status = "error"
    message = "Liên kết không hợp lệ. Không có mã xác minh."
  } else {
    const result = await verifyEmail(token)
    if (result.success) {
      status = "success"
      message = result.data?.message ?? "Xác minh thành công!"
    } else {
      status = "error"
      message = result.error ?? "Xác minh thất bại."
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border shadow-2xl p-8 text-center space-y-6">
          {status === "loading" ? (
            <>
              <div className="flex justify-center">
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="size-8 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold">Đang xác minh...</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Vui lòng đợi trong giây lát.
                </p>
              </div>
            </>
          ) : status === "success" ? (
            <>
              <div className="flex justify-center">
                <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle className="size-8 text-emerald-600" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-emerald-600">Xác minh thành công!</h1>
                <p className="text-sm text-muted-foreground mt-2">{message}</p>
              </div>
              <a
                href="/login"
                className="block w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Đăng nhập ngay
              </a>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="size-8 text-destructive" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-destructive">Xác minh thất bại</h1>
                <p className="text-sm text-muted-foreground mt-2">{message}</p>
              </div>
              <div className="space-y-3">
                <a
                  href="/login"
                  className="block w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  Quay về đăng nhập
                </a>
                <a
                  href="/register"
                  className="block w-full py-3 px-4 border border-border rounded-lg font-semibold hover:bg-muted transition-colors"
                >
                  Đăng ký tài khoản mới
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
