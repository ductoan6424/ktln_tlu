"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { reviewAnnouncement } from "@/actions/announcements"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

type AnnouncementReviewPanelProps = {
  announcementId: string
  status: "PENDING_UNIT_REVIEW" | "PENDING_ADMIN_REVIEW"
  revision: {
    version: number
    title: string
    content: string
    attachments: Array<{ id: string; name: string; url: string }>
    scopeLabels: string[]
  }
}

function stageLabel(status: AnnouncementReviewPanelProps["status"]) {
  return status === "PENDING_UNIT_REVIEW" ? "Duyet don vi" : "Duyet cap truong"
}

export function AnnouncementReviewPanel({
  announcementId,
  status,
  revision,
}: AnnouncementReviewPanelProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [changesComment, setChangesComment] = useState("")
  const [rejectComment, setRejectComment] = useState("")

  function decide(
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
    comment?: string,
  ) {
    startTransition(async () => {
      const result = await reviewAnnouncement({
        announcementId,
        decision,
        comment,
      })
      if (!result.success) {
        toast({
          title: "Khong the xu ly",
          description: result.error,
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Da ghi nhan quyet dinh",
        description: "Trang thai thong bao da duoc cap nhat.",
      })
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Ban trinh duyet v{revision.version}</CardTitle>
          <StatusBadge variant="warning">{stageLabel(status)}</StatusBadge>
        </div>
        <CardDescription>
          Noi dung duoi day la snapshot bat bien da nop de phe duyet.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">{revision.title}</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {revision.content}
          </p>
          <div className="flex flex-wrap gap-2">
            {revision.scopeLabels.map((label) => (
              <StatusBadge key={label} variant="info">
                {label}
              </StatusBadge>
            ))}
          </div>
        </div>

        {revision.attachments.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Tep dinh kem da nop
            </p>
            {revision.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {attachment.name}
              </a>
            ))}
          </div>
        )}

        <Button
          type="button"
          disabled={isPending}
          onClick={() => decide("APPROVED")}
        >
          Phe duyet
        </Button>

        <div className="flex flex-col gap-2">
          <Textarea
            name="comment"
            required
            value={changesComment}
            onChange={(event) => setChangesComment(event.target.value)}
            placeholder="Ly do va noi dung can chinh sua"
          />
          <Button
            type="button"
            variant="outline"
            disabled={isPending || !changesComment.trim()}
            onClick={() => decide("CHANGES_REQUESTED", changesComment.trim())}
          >
            Yeu cau sua
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Textarea
            name="comment"
            required
            value={rejectComment}
            onChange={(event) => setRejectComment(event.target.value)}
            placeholder="Ly do tu choi"
          />
          <Button
            type="button"
            variant="outline"
            disabled={isPending || !rejectComment.trim()}
            onClick={() => decide("REJECTED", rejectComment.trim())}
          >
            Tu choi
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
