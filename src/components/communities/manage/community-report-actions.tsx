"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Check, Trash2, X } from "lucide-react"

import {
  deleteReportedContent,
  dismissReport,
  resolveReport,
} from "@/actions/community-moderation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  facebookDangerButton,
  facebookPrimaryButton,
  facebookSecondaryButton,
  manageInput,
} from "@/components/communities/manage/manage-ui"

type CommunityReportActionsProps = {
  targetType: "GROUP" | "CLUB" | "COURSE"
  targetId: string
  reportId: string
  contentType: "POST" | "COMMENT"
  contentId: string
}

export function CommunityReportActions({
  targetType,
  targetId,
  reportId,
  contentType,
  contentId,
}: CommunityReportActionsProps) {
  const { refresh } = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-[#e4e6eb] pt-3">
      <form
        className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]"
        action={(formData) => {
          startTransition(async () => {
            const payload = {
              targetType,
              targetId,
              reportId,
              resolution: String(formData.get("resolution") ?? ""),
            }
            const result =
              formData.get("action") === "dismiss"
                ? await dismissReport(payload)
                : await resolveReport(payload)
            setMessage(
              result.success
                ? "Đã cập nhật báo cáo."
                : result.error ?? "Không thể xử lý.",
            )
            if (result.success) refresh()
          })
        }}
      >
        <input type="hidden" name="reportId" value={reportId} />
        <Input
          name="resolution"
          placeholder="Ghi chú xử lý"
          className={manageInput}
        />
        <Button
          size="sm"
          name="action"
          value="resolve"
          type="submit"
          disabled={pending}
          className={facebookPrimaryButton}
        >
          <Check data-icon="inline-start" />
          Đã xử lý
        </Button>
        <Button
          size="sm"
          name="action"
          value="dismiss"
          variant="outline"
          type="submit"
          disabled={pending}
          className={facebookSecondaryButton}
        >
          <X data-icon="inline-start" />
          Bỏ qua
        </Button>
      </form>

      <form
        action={(formData) => {
          startTransition(async () => {
            const result = await deleteReportedContent({
              targetType,
              targetId,
              reportId,
              contentType,
              contentId,
              resolution: String(formData.get("resolution") ?? ""),
            })
            setMessage(
              result.success
                ? "Đã xoá nội dung bị báo cáo."
                : result.error ?? "Không thể xoá.",
            )
            if (result.success) refresh()
          })
        }}
      >
        <input type="hidden" name="reportId" value={reportId} />
        <input type="hidden" name="contentId" value={contentId} />
        <input type="hidden" name="contentType" value={contentType} />
        <input type="hidden" name="resolution" value="Xoá nội dung sau khi xử lý báo cáo" />
        <Button
          size="sm"
          variant="outline"
          type="submit"
          disabled={pending}
          className={facebookDangerButton}
        >
          <Trash2 data-icon="inline-start" />
          Xoá nội dung
        </Button>
      </form>

      {message ? <p className="text-xs text-[#65676b]">{message}</p> : null}
    </div>
  )
}
