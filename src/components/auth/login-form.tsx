// src/components/auth/login-form.tsx
"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { SsoButton } from "@/components/auth/sso-button"
import { DividerLabel } from "@/components/shared/divider-label"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { login } from "@/actions/auth"
import { LogIn, User, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react"

interface LoginFormProps {}

export function LoginForm(_props: LoginFormProps) {
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu")
      return
    }

    setLoading(true)
    setError("")

    const result = await login(email, password)
    setLoading(false)

    if (result.success) {
      window.location.href = "/feed"
      return
    } else {
      setError(result.error ?? "Đăng nhập thất bại.")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin()
  }

  if (!showForm) {
    return (
      <Card className="shadow-2xl shadow-foreground/5 border">
        <CardContent className="p-8 lg:p-10">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold mb-2">Chào mừng trở lại</h1>
            <p className="text-muted-foreground text-sm">
              Truy cập cổng thông tin sinh viên
            </p>
          </div>

          <div className="space-y-4">
            <SsoButton
              icon={LogIn}
              label="Đăng nhập bằng tài khoản"
              variant="primary"
              onClick={() => setShowForm(true)}
            />

            <DividerLabel label="hoặc" />

            <SsoButton
              icon={User}
              label="Đăng nhập Giảng viên / Khách"
              variant="secondary"
              onClick={() => setShowForm(true)}
            />
          </div>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Khi đăng nhập, bạn đồng ý với{" "}
              <a href="/terms" className="text-primary hover:underline underline-offset-4">
                Điều khoản dịch vụ
              </a>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-2xl shadow-foreground/5 border">
      <CardContent className="p-8 lg:p-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Đăng nhập</h1>
          <p className="text-muted-foreground text-sm">
            Nhập thông tin tài khoản của bạn
          </p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-sm p-3">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="email@example.com"
                autoComplete="email"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mật khẩu"
                autoComplete="current-password"
                className="pl-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-11 font-semibold"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Quay lại
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function LoginFormSkeleton() {
  return (
    <Card className="shadow-2xl shadow-foreground/5 border">
      <CardContent className="p-8 lg:p-10 space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-4 w-56 mx-auto" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-4 w-12 mx-auto" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-3 w-48 mx-auto" />
      </CardContent>
    </Card>
  )
}