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
import {
  facebookPrimaryButton,
  manageHeader,
  manageInput,
  manageSurface,
} from "@/components/communities/manage/manage-ui"

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
    <Card className={`${manageSurface} gap-0 py-0`}>
      <CardHeader className={manageHeader}>
        <CardTitle className="text-lg font-bold text-[#050505]">
          Mời thành viên
        </CardTitle>
        <CardDescription className="text-[#65676b]">
          Nhập email hoặc mã sinh viên để gửi lời mời tham gia.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <form
          ref={formRef}
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
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
          <div className="flex min-w-0 flex-col gap-2">
            <Input
              name="identifier"
              required
              placeholder="Email hoặc mã sinh viên"
              autoComplete="off"
              className={manageInput}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-[#65676b]">{message}</p> : null}
          </div>
          <Button
            type="submit"
            disabled={pending}
            className={`${facebookPrimaryButton} h-10 self-start`}
          >
            <UserPlus data-icon="inline-start" />
            {pending ? "Đang gửi..." : "Gửi lời mời"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
