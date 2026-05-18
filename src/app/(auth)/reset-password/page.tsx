"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { resetPassword } from "@/actions/auth"
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!password) {
      setError("Mật khẩu không được trống")
      return
    }
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự")
      return
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp")
      return
    }

    setLoading(true)
    const result = await resetPassword({ token, password })
    setLoading(false)

    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error ?? "Đặt lại mật khẩu thất bại.")
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md shadow-2xl border">
        <CardContent className="space-y-6 p-5 text-center sm:p-8">
          <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle className="size-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-emerald-600">Đặt lại mật khẩu thành công!</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Mật khẩu của bạn đã được thay đổi. Bây giờ bạn có thể đăng nhập.
            </p>
          </div>
          <Link
            href="/login"
            className="block w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold text-center hover:bg-primary/90"
          >
            Đăng nhập ngay
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border">
      <CardContent className="space-y-6 p-5 sm:p-8">
        <div className="text-center space-y-2">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">Đặt lại mật khẩu</h1>
          <p className="text-sm text-muted-foreground">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="reset-password-new">Mật khẩu mới</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="reset-password-new"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 8 ký tự"
                className="pl-9 pr-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="reset-password-confirm">Xác nhận mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="reset-password-confirm"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="pl-9 pr-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <XCircle className="size-3 shrink-0" />
              {error}
            </p>
          )}

            <Button type="submit" disabled={loading} className="w-full h-11 font-semibold">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Đang xử lý...
                </>
              ) : (
                "Đặt lại mật khẩu"
              )}
            </Button>
          </form>

        <div className="text-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Quay về đăng nhập
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function InvalidTokenState() {
  return (
    <Card className="w-full max-w-md shadow-2xl border">
      <CardContent className="space-y-4 p-5 text-center sm:p-8">
        <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <XCircle className="size-8 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">Liên kết không hợp lệ</h1>
        <p className="text-sm text-muted-foreground">
          Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
        </p>
        <Link
          href="/login"
          className="block w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold text-center"
        >
          Quay về đăng nhập
        </Link>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <Card className="w-full max-w-md shadow-2xl border">
      <CardContent className="space-y-6 p-5 sm:p-8">
        <div className="text-center space-y-3">
          <Skeleton className="size-12 rounded-full mx-auto" />
          <Skeleton className="h-7 w-40 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

function ResetPasswordPageInner() {
  const token = useSearchParams().get("token")

  return (
    <div className="flex w-full items-center justify-center">
      {token ? <ResetPasswordForm token={token} /> : <InvalidTokenState />}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center">
          <LoadingState />
        </div>
      }
    >
      <ResetPasswordPageInner />
    </Suspense>
  )
}
