// src/app/(auth)/verify-email/page.tsx
import Link from "next/link"

import { verifyEmail } from "@/actions/auth"
import { CheckCircle, XCircle } from "lucide-react"

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams


  if (token) {
    const result = await verifyEmail(token)
    if (!result.success) {
      return (
        <div className="flex w-full items-center justify-center">
          <div className="w-full max-w-md">
            <div className="space-y-6 rounded-2xl border bg-card p-5 text-center shadow-2xl sm:p-8">
              <div className="flex justify-center">
                <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="size-8 text-destructive" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-destructive">Xác minh thất bại</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {result.error ?? "Xác minh thất bại."}
                </p>
              </div>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  Quay về đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="block w-full py-3 px-4 border border-border rounded-lg font-semibold hover:bg-muted transition-colors"
                >
                  Đăng ký tài khoản mới
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex w-full items-center justify-center">
        <div className="w-full max-w-md">
          <div className="space-y-6 rounded-2xl border bg-card p-5 text-center shadow-2xl sm:p-8">
            <div className="flex justify-center">
              <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="size-8 text-emerald-600" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-emerald-600">Xác minh thành công!</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Tài khoản của bạn đã được xác minh. Bây giờ bạn có thể đăng nhập.
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full items-center justify-center">
      <div className="w-full max-w-md">
        <div className="space-y-6 rounded-2xl border bg-card p-5 text-center shadow-2xl sm:p-8">
          <div className="flex justify-center">
            <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="size-8 text-destructive" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-destructive">Liên kết không hợp lệ</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Không có mã xác minh trong liên kết.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Quay về đăng nhập
            </Link>
            <Link
              href="/register"
              className="block w-full py-3 px-4 border border-border rounded-lg font-semibold hover:bg-muted transition-colors"
            >
              Đăng ký tài khoản mới
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
