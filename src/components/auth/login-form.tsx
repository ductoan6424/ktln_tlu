"use client"

import { useReducer } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react"

import { login } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

interface LoginFormProps {
  onSuccess?: () => void
}

type LoginState = {
  email: string
  password: string
  showPassword: boolean
  error: string
  loading: boolean
}

const initialLoginState: LoginState = {
  email: "",
  password: "",
  showPassword: false,
  error: "",
  loading: false,
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { push } = useRouter()
  const [state, setState] = useReducer(
    (current: LoginState, next: Partial<LoginState>) => ({ ...current, ...next }),
    initialLoginState,
  )
  const { email, password, showPassword, error, loading } = state

  const handleLogin = async () => {
    if (!email || !password) {
      setState({ error: "Vui lòng nhập tài khoản trường và mật khẩu" })
      return
    }

    setState({ loading: true, error: "" })

    const result = await login(email, password)
    setState({ loading: false })

    if (result.success) {
      push("/feed")
      onSuccess?.()
    } else {
      setState({ error: result.error ?? "Đăng nhập thất bại." })
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") handleLogin()
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Đăng nhập</h1>
        </div>

        <div className="flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-sm p-3">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="login-email">Tài khoản</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setState({ email: event.target.value })}
                onKeyDown={handleKeyDown}
                placeholder="Email"
                autoComplete="email"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="login-password">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setState({ password: event.target.value })}
                onKeyDown={handleKeyDown}
                placeholder="Mật khẩu"
                autoComplete="current-password"
                className="pl-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setState({ showPassword: !showPassword })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
        </div>
      </CardContent>
    </Card>
  )
}

export function LoginFormSkeleton() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-2 text-center">
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-4 w-56 mx-auto" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}
