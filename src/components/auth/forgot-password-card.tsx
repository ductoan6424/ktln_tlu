"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { forgotPassword } from "@/actions/auth"
import {
  Mail,
  ArrowLeft,
  Check,
  X,
  Loader2,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"

// ─── Form field ───────────────────────────────────────────────────────────────

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="size-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Success state ───────────────────────────────────────────────────────────

function SuccessState() {
  return (
    <div className="space-y-6 text-center animate-in fade-in duration-300">
      <div className="flex justify-center">
        <div className="relative">
          <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Check className="size-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Đã gửi email khôi phục!
        </h2>
        <p className="text-sm text-muted-foreground">
          Nếu tài khoản tồn tại, liên kết đặt lại mật khẩu đã được gửi đến email liên hệ đã xác thực.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
        <div className="flex items-start gap-2">
          <ShieldCheck className="size-4 text-primary mt-0.5 shrink-0" />
          <p>
            Liên kết sẽ hết hạn sau <span className="font-medium text-foreground">60 phút</span>.
            Nếu không thấy email, hãy kiểm tra thư mục spam.
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full h-11"
        size="lg"
        render={<Link href="/login" />}
      >
        <ArrowLeft className="size-4 mr-1" />
        Quay về đăng nhập
      </Button>

      <div className="text-xs text-muted-foreground">
        Không nhận được email?{" "}
        <button
          type="button"
          className="text-primary hover:underline font-medium"
        >
          Gửi lại
        </button>
      </div>
    </div>
  )
}

// ─── Main ForgotPasswordCard ─────────────────────────────────────────────────

export function ForgotPasswordCard() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const validate = () => {
    if (!email.trim()) {
      setError("Email không được để trống")
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email không hợp lệ")
      return false
    }
    setError("")
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    const result = await forgotPassword(email)
    setLoading(false)

    if (result.success) {
      setSubmitted(true)
    } else {
      setError(result.error ?? "Đã xảy ra lỗi. Vui lòng thử lại.")
    }
  }

  if (submitted) {
    return (
      <Card className="shadow-2xl shadow-foreground/5 border">
        <CardContent className="p-5 sm:p-8 lg:p-10">
          <SuccessState />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-2xl shadow-foreground/5 border">
      <CardContent className="p-5 sm:p-8 lg:p-10">
        {/* Tiêu đề */}
        <div className="mb-6 text-center sm:mb-8">
          <div className="flex justify-center mb-4">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="size-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold mb-1.5">Quên mật khẩu?</h1>
          <p className="text-sm text-muted-foreground">
            Nhập email trường hoặc email liên hệ đã xác thực để khôi phục mật khẩu
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label="Email" error={error}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError("")
                }}
                placeholder="email@example.com"
                autoComplete="email"
                className="pl-9"
                aria-invalid={!!error}
              />
            </div>
          </FormField>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 font-semibold"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Đang gửi…
              </>
            ) : (
              "Gửi liên kết khôi phục"
            )}
          </Button>
        </form>

        {/* Back link */}
        <div className="mt-6 pt-5 border-t border-border text-center">
          <Button variant="ghost" className="text-sm" render={<Link href="/login" className="gap-1.5" />}>
            <ArrowLeft className="size-4" />
            Quay về đăng nhập
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ForgotPasswordCardSkeleton() {
  return (
    <Card className="shadow-2xl shadow-foreground/5 border">
      <CardContent className="space-y-6 p-5 sm:p-8 lg:p-10">
        <div className="text-center space-y-3">
          <Skeleton className="size-12 rounded-full mx-auto" />
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
        <Skeleton className="h-4 w-32 mx-auto" />
      </CardContent>
    </Card>
  )
}
