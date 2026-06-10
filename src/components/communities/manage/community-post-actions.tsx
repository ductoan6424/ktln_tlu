"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Check, PinOff, X } from "lucide-react"

import {
  approveCommunityPost,
  rejectCommunityPost,
  unpinCommunityPost,
} from "@/actions/community-moderation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  manageDangerButton,
  managePrimaryButton,
  manageSecondaryButton,
  manageInput,
} from "@/components/communities/manage/manage-ui"

type CommunityPostActionsProps = {
  targetType: "GROUP" | "CLUB" | "COURSE"
  targetId: string
  postId: string
  mode: "pending" | "pinned"
}

export function CommunityPostActions({
  targetType,
  targetId,
  postId,
  mode,
}: CommunityPostActionsProps) {
  const { refresh } = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  if (mode === "pinned") {
    return (
      <form
        className="mt-4 border-t border-border pt-3"
        action={(formData) => {
          startTransition(async () => {
            const result = await unpinCommunityPost({
              targetType,
              targetId,
              postId: String(formData.get("postId") ?? ""),
            })
            setMessage(
              result.success
                ? "Đã bỏ ghim bài viết."
                : result.error ?? "Không thể bỏ ghim.",
            )
            if (result.success) refresh()
          })
        }}
      >
        <input type="hidden" name="postId" value={postId} />
        <Button
          size="sm"
          variant="outline"
          type="submit"
          disabled={pending}
          className={manageSecondaryButton}
        >
          <PinOff data-icon="inline-start" />
          Bỏ ghim
        </Button>
        {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
      </form>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-wrap gap-2">
        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await approveCommunityPost({
                targetType,
                targetId,
                postId: String(formData.get("postId") ?? ""),
              })
              setMessage(
                result.success
                  ? "Đã duyệt bài viết."
                  : result.error ?? "Không thể duyệt.",
              )
              if (result.success) refresh()
            })
          }}
        >
          <input type="hidden" name="postId" value={postId} />
          <Button
            size="sm"
            type="submit"
            disabled={pending}
            className={managePrimaryButton}
          >
            <Check data-icon="inline-start" />
            Duyệt
          </Button>
        </form>
      </div>

      <form
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
        action={(formData) => {
          startTransition(async () => {
            const result = await rejectCommunityPost({
              targetType,
              targetId,
              postId: String(formData.get("postId") ?? ""),
              reason: String(formData.get("reason") ?? ""),
            })
            setMessage(
              result.success
                ? "Đã từ chối bài viết."
                : result.error ?? "Không thể từ chối.",
            )
            if (result.success) refresh()
          })
        }}
      >
        <input type="hidden" name="postId" value={postId} />
        <Input
          name="reason"
          placeholder="Lý do từ chối"
          className={manageInput}
        />
        <Button
          size="sm"
          variant="outline"
          type="submit"
          disabled={pending}
          className={manageDangerButton}
        >
          <X data-icon="inline-start" />
          Từ chối
        </Button>
      </form>

      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  )
}
