"use client"

import { useState, useTransition } from "react"
import { Loader2, Mail } from "lucide-react"

import { requestContactEmailChangeVerification } from "@/actions/contact-email"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SectionHeader } from "@/components/shared/section-header"

interface ContactEmailSectionProps {
  currentEmail?: string | null
}

export function ContactEmailSection({ currentEmail }: ContactEmailSectionProps) {
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    setError("")
    setMessage("")
    startTransition(async () => {
      const result = await requestContactEmailChangeVerification(email, currentPassword)
      if (!result.success) {
        setError(result.error ?? "Không thể gửi email xác thực.")
        return
      }
      setMessage("Đã gửi link xác thực đến email mới.")
      setEmail("")
      setCurrentPassword("")
    })
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-1">
          <SectionHeader title="Email liên hệ" />
          <p className="text-xs text-muted-foreground">
            Email này dùng để nhận thông báo và khôi phục mật khẩu. Đổi email cần xác nhận bằng mật khẩu hiện tại.
          </p>
        </div>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <span>{currentEmail ?? "Chưa có email liên hệ đã xác thực"}</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="new-contact-email">Email mới</label>
            <Input
              id="new-contact-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="contact-email-password">Mật khẩu hiện tại</label>
            <Input
              id="contact-email-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Mật khẩu"
            />
          </div>
        </div>

        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {message && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{message}</p>}

        <div className="flex justify-end">
          <Button type="button" onClick={submit} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Gửi xác thực email mới
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
