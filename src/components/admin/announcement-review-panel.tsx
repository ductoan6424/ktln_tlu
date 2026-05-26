import { reviewAnnouncement } from "@/actions/announcements"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

type ReviewRevision = {
  version: number
  title: string
  content: string
  attachments: Array<{
    id: string
    name: string
    url: string
  }>
  scopeLabels: string[]
}

interface AnnouncementReviewPanelProps {
  announcementId: string
  status: "PENDING_UNIT_REVIEW" | "PENDING_ADMIN_REVIEW"
  revision: ReviewRevision
}

function stageLabel(status: AnnouncementReviewPanelProps["status"]) {
  return status === "PENDING_UNIT_REVIEW" ? "Duyet don vi" : "Duyet cap truong"
}

export function AnnouncementReviewPanel({
  announcementId,
  status,
  revision,
}: AnnouncementReviewPanelProps) {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Ban trinh duyet v{revision.version}</h2>
            <p className="text-sm text-muted-foreground">
              Noi dung da dong bang; moi thay doi phai tra lai tac gia.
            </p>
          </div>
          <StatusBadge variant="warning">{stageLabel(status)}</StatusBadge>
        </div>

        <div className="space-y-3 rounded-md border p-4">
          <h3 className="font-medium">{revision.title}</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {revision.content}
          </p>
          {revision.scopeLabels.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Pham vi: {revision.scopeLabels.join(", ")}
            </p>
          ) : null}
          {revision.attachments.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {revision.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <a className="text-primary underline" href={attachment.url} target="_blank" rel="noreferrer">
                    {attachment.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <form
            action={async (formData) => {
              "use server"
              await reviewAnnouncement(formData)
            }}
            className="space-y-3 rounded-md border p-3"
          >
            <input type="hidden" name="announcementId" value={announcementId} />
            <input type="hidden" name="decision" value="APPROVED" />
            <p className="text-sm text-muted-foreground">Chap nhan ban trinh duyet nay.</p>
            <Button type="submit" className="w-full">Phe duyet</Button>
          </form>

          <form
            action={async (formData) => {
              "use server"
              await reviewAnnouncement(formData)
            }}
            className="space-y-3 rounded-md border p-3"
          >
            <input type="hidden" name="announcementId" value={announcementId} />
            <input type="hidden" name="decision" value="CHANGES_REQUESTED" />
            <Textarea name="comment" required placeholder="Noi dung can chinh sua" />
            <Button type="submit" variant="outline" className="w-full">Yeu cau sua</Button>
          </form>

          <form
            action={async (formData) => {
              "use server"
              await reviewAnnouncement(formData)
            }}
            className="space-y-3 rounded-md border p-3"
          >
            <input type="hidden" name="announcementId" value={announcementId} />
            <input type="hidden" name="decision" value="REJECTED" />
            <Textarea name="comment" required placeholder="Ly do tu choi" />
            <Button type="submit" variant="destructive" className="w-full">Tu choi</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
