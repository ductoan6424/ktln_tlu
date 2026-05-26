"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ListFilter, Plus } from "lucide-react"

import {
  createReplacementAnnouncement,
  publishAnnouncement,
  withdrawAnnouncement,
} from "@/actions/announcements"
import type { AnnouncementDto } from "@/lib/announcements/queries"
import {
  AnnouncementForm,
  type AnnouncementAuthorUnit,
  type AnnouncementFormInitialValues,
} from "@/components/admin/announcement-form"
import { AnnouncementList } from "@/components/admin/announcement-list"
import { AnnouncementPreview } from "@/components/admin/announcement-preview"
import { AnnouncementReviewPanel } from "@/components/admin/announcement-review-panel"
import { AnnouncementTimeline } from "@/components/admin/announcement-timeline"
import type { AnnouncementTargetOptions } from "@/components/admin/announcement-target-selector"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

type WorkspaceTab = "compose" | "queue"
type QueueTab =
  | "ALL"
  | "DRAFT"
  | "CHANGES_REQUESTED"
  | "PENDING_UNIT_REVIEW"
  | "PENDING_ADMIN_REVIEW"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "WITHDRAWN"

const WORKSPACE_TABS = [
  { label: "Soạn thảo", value: "compose" },
  { label: "Hàng đợi và lịch sử", value: "queue" },
]

const QUEUE_TABS: Array<{ label: string; value: QueueTab }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "Bản nháp", value: "DRAFT" },
  { label: "Cần sửa", value: "CHANGES_REQUESTED" },
  { label: "Chờ duyệt đơn vị", value: "PENDING_UNIT_REVIEW" },
  { label: "Chờ duyệt cấp trường", value: "PENDING_ADMIN_REVIEW" },
  { label: "Đã duyệt", value: "APPROVED" },
  { label: "Đã lên lịch", value: "SCHEDULED" },
  { label: "Đã phát hành", value: "PUBLISHED" },
  { label: "Đã thu hồi", value: "WITHDRAWN" },
]

type AnnouncementsClientProps = {
  initialItems: AnnouncementDto[]
  initialTotal: number
  authorUnits: AnnouncementAuthorUnit[]
  approverUnitIds: string[]
  isSystemAdmin: boolean
  targetOptions: AnnouncementTargetOptions
}

function toFormValues(item: AnnouncementDto): AnnouncementFormInitialValues {
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    issuingUnitId: item.issuingUnit?.id ?? null,
    category: item.category,
    priority: item.priority,
    audience: item.audience,
    targets: item.targets,
    scopeLabels: item.scopeLabels,
    pinToTop: item.pinToTop,
    requestEmailDelivery: item.requestEmailDelivery,
    requiresAcknowledgement: item.requiresAcknowledgement,
    scheduledAt: item.scheduledAt,
    actionDeadlineAt: item.actionDeadlineAt,
    expiresAt: item.expiresAt,
    attachments: item.attachments,
    status: item.status,
  }
}

export default function AnnouncementsClient({
  initialItems,
  initialTotal,
  authorUnits,
  approverUnitIds,
  isSystemAdmin,
  targetOptions,
}: AnnouncementsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("compose")
  const [queueTab, setQueueTab] = useState<QueueTab>("ALL")
  const [editTarget, setEditTarget] =
    useState<AnnouncementFormInitialValues | null>(null)
  const [draftPreview, setDraftPreview] =
    useState<AnnouncementFormInitialValues | null>(null)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [withdrawTarget, setWithdrawTarget] = useState<AnnouncementDto | null>(null)
  const [withdrawReason, setWithdrawReason] = useState("")

  const filteredItems = useMemo(() => {
    if (queueTab === "ALL") return initialItems
    return initialItems.filter((item) => item.status === queueTab)
  }, [initialItems, queueTab])
  const selectedReview =
    initialItems.find((item) => item.id === selectedReviewId) ?? null

  function canReview(item: AnnouncementDto) {
    if (item.status === "PENDING_ADMIN_REVIEW") return isSystemAdmin
    return (
      item.status === "PENDING_UNIT_REVIEW" &&
      Boolean(item.issuingUnit && approverUnitIds.includes(item.issuingUnit.id))
    )
  }

  function handleEdit(item: AnnouncementDto) {
    setEditTarget(toFormValues(item))
    setDraftPreview(null)
    setActiveTab("compose")
  }

  function handleNew() {
    setEditTarget(null)
    setDraftPreview(null)
    setActiveTab("compose")
  }

  function handleSaved() {
    setEditTarget(null)
    setDraftPreview(null)
    router.refresh()
  }

  function handlePublish(item: AnnouncementDto) {
    startTransition(async () => {
      const result = await publishAnnouncement(item.id)
      if (!result.success) {
        toast({
          title: "Không thể phát hành",
          description: result.error,
          variant: "destructive",
        })
        return
      }
      toast({
        title:
          result.data?.status === "SCHEDULED" ? "Đã lên lịch" : "Đã phát hành",
        description:
          result.data?.status === "SCHEDULED"
            ? "Thông báo sẽ phát hành theo lịch đã được duyệt."
            : `Đã tạo ${result.data?.recipients ?? 0} bản ghi người nhận.`,
      })
      router.refresh()
    })
  }

  function requestWithdrawal(item: AnnouncementDto) {
    setWithdrawTarget(item)
    setWithdrawReason("")
  }

  function handleWithdraw() {
    if (!withdrawTarget) return
    if (!withdrawReason.trim()) {
      toast({
        title: "Cần nhập lý do thu hồi",
        description: "Lý do được lưu trong nhật ký kiểm toán và hiển thị cho người nhận.",
        variant: "destructive",
      })
      return
    }
    startTransition(async () => {
      const result = await withdrawAnnouncement(withdrawTarget.id, withdrawReason)
      if (!result.success) {
        toast({
          title: "Không thể thu hồi",
          description: result.error,
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Đã thu hồi thông báo",
        description: "Người nhận vẫn thấy bản ghi đã giao kèm lý do thu hồi.",
      })
      setWithdrawTarget(null)
      setWithdrawReason("")
      router.refresh()
    })
  }

  function handleCreateReplacement(item: AnnouncementDto) {
    startTransition(async () => {
      const result = await createReplacementAnnouncement(item.id)
      if (!result.success) {
        toast({
          title: "Không thể tạo bản thay thế",
          description: result.error,
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Đã tạo bản nháp thay thế",
        description: "Bản thay thế phải đi qua quy trình duyệt trước khi phát hành.",
      })
      setQueueTab("DRAFT")
      router.refresh()
    })
  }

  const formValues = editTarget ?? undefined
  const previewValues = draftPreview ?? formValues

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Thông báo chính thức - Đại học Thăng Long
          </h1>
          <p className="text-sm text-muted-foreground">
            Thông báo phải được duyệt theo đơn vị ban hành và cấp trường khi
            vượt phạm vi.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={handleNew}>
          <Plus data-icon="inline-start" />
          Tạo thông báo
        </Button>
      </div>

      <TabNavigation
        tabs={WORKSPACE_TABS}
        activeTab={activeTab}
        onTabChange={(value) => setActiveTab(value as WorkspaceTab)}
      />

      {activeTab === "compose" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <AnnouncementForm
            key={editTarget?.id ?? "new"}
            initialValues={formValues}
            authorUnits={authorUnits}
            targetOptions={targetOptions}
            onSaved={handleSaved}
            onDraftChange={setDraftPreview}
          />
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <AnnouncementPreview
              title={previewValues?.title}
              content={previewValues?.content}
              audience={previewValues?.audience ?? "ALL"}
              scopeLabels={previewValues?.scopeLabels}
              pinToTop={previewValues?.pinToTop ?? false}
            />
          </aside>
        </div>
      )}

      {activeTab === "queue" && (
        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <ListFilter data-icon="inline-start" />
                {initialTotal} hồ sơ thông báo
              </span>
              <TabNavigation
                tabs={QUEUE_TABS}
                activeTab={queueTab}
                onTabChange={(value) => setQueueTab(value as QueueTab)}
                variant="pill"
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
            <div className="flex flex-col gap-4">
              {withdrawTarget && (
                <Card size="sm">
                  <CardContent className="flex flex-col gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Thu hồi: {withdrawTarget.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Bản ghi người nhận sẽ được giữ lại làm bằng chứng giao nhận.
                      </p>
                    </div>
                    <label htmlFor="announcement-withdrawal-reason" className="text-sm font-medium">
                      Lý do thu hồi
                    </label>
                    <Textarea
                      id="announcement-withdrawal-reason"
                      value={withdrawReason}
                      onChange={(event) => setWithdrawReason(event.target.value)}
                      placeholder="Nhập lý do để thông báo rõ cho người nhận"
                      maxLength={1000}
                    />
                    <div className="flex gap-2">
                      <Button type="button" disabled={isPending} onClick={handleWithdraw}>
                        Xác nhận thu hồi
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setWithdrawTarget(null)}
                      >
                        Hủy
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <AnnouncementList
                items={filteredItems}
                onEdit={handleEdit}
                onPublish={handlePublish}
                onReview={(item) => setSelectedReviewId(item.id)}
                onWithdraw={requestWithdrawal}
                onCreateReplacement={handleCreateReplacement}
                canReview={canReview}
              />
            </div>
            {selectedReview &&
              canReview(selectedReview) &&
              (selectedReview.status === "PENDING_UNIT_REVIEW" ||
                selectedReview.status === "PENDING_ADMIN_REVIEW") &&
              selectedReview.activeRevision && (
                <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
                  <AnnouncementReviewPanel
                    announcementId={selectedReview.id}
                    status={selectedReview.status}
                    revision={{
                      version: selectedReview.activeRevision.version,
                      title: selectedReview.activeRevision.title,
                      content: selectedReview.activeRevision.content,
                      attachments: selectedReview.activeRevision.attachments,
                      scopeLabels: selectedReview.activeRevision.scopeLabels,
                    }}
                  />
                  <AnnouncementTimeline entries={selectedReview.auditEvents} />
                </aside>
              )}
          </div>
          {isPending && (
            <p className="text-sm text-muted-foreground">
              Đang xử lý phát hành...
            </p>
          )}
        </div>
      )}
    </div>
  )
}
