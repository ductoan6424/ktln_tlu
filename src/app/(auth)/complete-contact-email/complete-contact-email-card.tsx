"use client"

import { useState, useTransition } from "react"
import { Mail, Loader2 } from "lucide-react"

import { requestContactEmailVerification } from "@/actions/contact-email"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

export function CompleteContactEmailCard() {
  const [email, setEmail] = useState("")
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const submit = () => {
    startTransition(async () => {
      const result = await requestContactEmailVerification(email)
      if (!result.success) {
        toast({
          title: "Không thể gửi email xác thực",
          description: result.error ?? "Vui lòng thử lại.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Đã gửi link xác thực",
        description: "Vui lòng kiểm tra hộp thư của email bạn vừa nhập.",
      })
    })
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">Xác thực email liên hệ</h1>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="contact-email">Email thật</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@example.com"
                autoComplete="email"
                className="pl-9"
              />
            </div>
          </div>

          <Button type="button" className="w-full h-11" onClick={submit} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Gửi link xác thực
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
