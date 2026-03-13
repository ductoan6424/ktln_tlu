"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SsoButton } from "@/components/auth/sso-button"
import { DividerLabel } from "@/components/shared/divider-label"
import { Skeleton } from "@/components/ui/skeleton"
import { LogIn, User } from "lucide-react"
import Link from "next/link"

export function LoginCard() {
  const [showManualLogin, setShowManualLogin] = useState(false)
  const [manualLoginError, setManualLoginError] = useState<string | null>(null)

  const handleManualLoginSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setManualLoginError("Email không hợp lệ.")
      return
    }

    if (password.length < 8) {
      setManualLoginError("Mật khẩu phải có ít nhất 8 ký tự.")
      return
    }

    setManualLoginError(null)
  }

  return (
    <Card className="shadow-2xl shadow-foreground/5 border">
      <CardContent className="p-8 lg:p-10">
        {/* Tiêu đề */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold mb-2">Chào mừng trở lại</h1>
          <p className="text-muted-foreground text-sm">
            Truy cập cổng thông tin sinh viên
          </p>
        </div>

        {/* Nút đăng nhập */}
        <div className="space-y-4">
          <SsoButton
            icon={LogIn}
            label="Đăng nhập bằng tài khoản trường"
            variant="primary"
          />

          <DividerLabel label="hoặc" />

          <SsoButton
            icon={User}
            label="Đăng nhập Giảng viên / Khách"
            variant="secondary"
            onClick={() => {
              setShowManualLogin((prev) => !prev)
              setManualLoginError(null)
            }}
          />

          {showManualLogin ? (
            <form className="space-y-3 rounded-lg border border-border p-4" onSubmit={handleManualLoginSubmit} noValidate>
              <Input type="email" name="email" placeholder="Email" required />
              <Input type="password" name="password" placeholder="Mật khẩu" required />
              {manualLoginError ? (
                <p className="text-sm text-destructive" role="alert">
                  {manualLoginError}
                </p>
              ) : null}
              <Button type="submit" size="lg" className="w-full">
                Đăng nhập
              </Button>
              <div className="flex items-center justify-between pt-1 text-sm">
                <Link
                  href="/forgot-password"
                  className="text-primary hover:underline underline-offset-4"
                >
                  Quên mật khẩu
                </Link>
                <p className="text-muted-foreground">
                  Bạn chưa có tài khoản?{" "}
                  <Link
                    href="/register"
                    className="text-primary font-medium hover:underline underline-offset-4"
                  >
                    Đăng ký
                  </Link>
                </p>
              </div>
            </form>
          ) : null}
        </div>

        {/* Điều khoản */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Khi đăng nhập, bạn đồng ý với{" "}
            <Link
              href="/terms"
              className="text-primary hover:underline underline-offset-4"
            >
              Điều khoản dịch vụ
            </Link>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function LoginCardSkeleton() {
  return (
    <Card className="shadow-2xl shadow-foreground/5 border">
      <CardContent className="p-8 lg:p-10 space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-4 w-56 mx-auto" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-4 w-12 mx-auto" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-3 w-48 mx-auto" />
      </CardContent>
    </Card>
  )
}
