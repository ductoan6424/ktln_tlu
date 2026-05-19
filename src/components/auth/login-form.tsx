// src/components/auth/login-form.tsx
"use client"

import { useReducer } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { SsoButton } from "@/components/auth/sso-button"
import { DividerLabel } from "@/components/shared/divider-label"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { login } from "@/actions/auth"
import { LogIn, User, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react"

interface LoginFormProps {
  onSuccess?: () => void
}

type LoginState = {
  showForm: boolean
  email: string
  password: string
  showPassword: boolean
  error: string
  loading: boolean
}

const initialLoginState: LoginState = {
  showForm: false,
  email: "",
  password: "",
  showPassword: false,
  error: "",
  loading: false,
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { push, refresh } = useRouter()
  const [state, setState] = useReducer(
    (current: LoginState, next: Partial<LoginState>) => ({ ...current, ...next }),
    initialLoginState,
  )
  const { showForm, email, password, showPassword, error, loading } = state

  const handleLogin = async () => {
    if (!email || !password) {
      setState({ error: "Vui lòng nhập email và mật khẩu" })
      return
    }

    setState({ loading: true, error: "" })

    const result = await login(email, password)
    setState({ loading: false })

    if (result.success) {
      push("/feed")
      refresh()
      onSuccess?.()
    } else {
      setState({ error: result.error ?? "Đăng nhập thất bại." })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin()
  }

  if (!showForm) {
    return (
      <Card className="shadow-2xl shadow-foreground/5 border">
        <CardContent className="p-5 sm:p-8 lg:p-10">
          <div className="mb-8 text-center sm:mb-10">
            <h1 className="text-2xl font-semibold mb-2">Chào mừng trở lại</h1>
            <p className="text-muted-foreground text-sm">
              Truy cập cổng thông tin sinh viên
            </p>
          </div>

          <div className="space-y-4">
            <SsoButton
              icon={LogIn}
              label="Đăng nhập bằng tài khoản"
              variant="primary"
              onClick={() => setState({ showForm: true })}
            />

            <DividerLabel label="hoặc" />

            <SsoButton
              icon={User}
              label="Đăng nhập Giảng viên / Khách"
              variant="secondary"
              onClick={() => setState({ showForm: true })}
            />
          </div>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Khi đăng nhập, bạn đồng ý với{" "}
              <Link href="/terms" className="text-primary hover:underline underline-offset-4">
                Điều khoản dịch vụ
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-2xl shadow-foreground/5 border">
      <CardContent className="p-5 sm:p-8 lg:p-10">
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-semibold mb-2">Đăng nhập</h1>
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
            <label className="text-sm font-medium" htmlFor="login-email">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setState({ email: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder="email@example.com"
                autoComplete="email"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="login-password">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setState({ password: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder="Mật khẩu"
                autoComplete="current-password"
                className="pl-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setState({ showPassword: !showPassword })}
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
              onClick={() => setState({ showForm: false })}
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
      <CardContent className="space-y-6 p-5 sm:p-8 lg:p-10">
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
