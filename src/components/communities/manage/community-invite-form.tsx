"use client"

import { useRef, useState, useTransition } from "react"
import { UserPlus } from "lucide-react"

import { inviteCommunityMember } from "@/actions/community-management"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type CommunityInviteFormProps = {
  type: "GROUP" | "CLUB"
  slugId: string
}

export function CommunityInviteForm({ type, slugId }: CommunityInviteFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mời thành viên</CardTitle>
        <CardDescription>
          Nhập email hoặc mã sinh viên để gửi lời mời tham gia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          className="flex flex-col gap-3 sm:flex-row"
          action={(formData) => {
            startTransition(async () => {
              setError(null)
              setMessage(null)
              const result = await inviteCommunityMember(formData)

              if (!result.success) {
                setError(result.error ?? "Không thể gửi lời mời")
                return
              }

              formRef.current?.reset()
              setMessage("Đã gửi lời mời.")
            })
          }}
        >
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="slugId" value={slugId} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Input
              name="identifier"
              required
              placeholder="Email hoặc mã sinh viên"
              autoComplete="off"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>
          <Button type="submit" disabled={pending} className="self-start">
            <UserPlus data-icon="inline-start" />
            {pending ? "Đang gửi..." : "Gửi lời mời"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
