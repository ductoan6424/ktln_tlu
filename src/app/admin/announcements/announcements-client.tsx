"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"

import {
  AnnouncementForm,
  type AnnouncementFormInitialValues,
} from "@/components/admin/announcement-form"
import { AnnouncementPreview } from "@/components/admin/announcement-preview"
import {
  AnnouncementList,
  type AdminAnnouncementItem,
} from "@/components/admin/announcement-list"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ListFilter, Plus } from "lucide-react"

type TabValue = "compose" | "manage"

type StatusFilter = "ALL" | "PUBLISHED" | "DRAFT" | "ARCHIVED"

const TABS = [
  { label: "Soạn thảo", value: "compose" as const },
  { label: "Quản lý", value: "manage" as const },
]

const STATUS_FILTERS: Array<{ label: string; value: StatusFilter }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "Đã đăng", value: "PUBLISHED" },
  { label: "Bản nháp", value: "DRAFT" },
  { label: "Đã ẩn", value: "ARCHIVED" },
]

interface AnnouncementsClientProps {
  initialItems: AdminAnnouncementItem[]
  initialTotal: number
}

export default function AnnouncementsClient({
  initialItems,
  initialTotal,
}: AnnouncementsClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabValue>("compose")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [editTarget, setEditTarget] = useState<AnnouncementFormInitialValues | null>(null)

  const filteredItems = useMemo(() => {
    if (statusFilter === "ALL") return initialItems
    return initialItems.filter((item) => item.status === statusFilter)
  }, [initialItems, statusFilter])

  function handleEdit(item: AdminAnnouncementItem) {
    setEditTarget({
      id: item.id,
      title: item.title,
      content: item.content,
      audience: item.audience,
      pinToTop: item.pinToTop,
      expiresAt: item.expiresAt,
      status: item.status,
    })
    setActiveTab("compose")
  }

  function handleSaved() {
    setEditTarget(null)
    router.refresh()
  }

  function handleNewCompose() {
    setEditTarget(null)
    setActiveTab("compose")
  }

  const formValues = activeTab === "compose" ? editTarget ?? undefined : undefined

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Thông báo chính thức</h1>
          <p className="text-sm text-muted-foreground">
            Tạo và quản lý thông báo hiển thị ở bảng tin của sinh viên và giảng viên
          </p>
        </div>
        <Button variant="outline" onClick={handleNewCompose}>
          <Plus className="size-4 mr-2" />
          Tạo mới
        </Button>
      </div>

      <TabNavigation
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(v) => setActiveTab(v as TabValue)}
      />

      {activeTab === "compose" && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <AnnouncementForm
              key={editTarget?.id ?? "new"}
              initialValues={formValues}
              onSaved={handleSaved}
            />
          </div>
          <div className="w-full lg:w-[380px] shrink-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
            <AnnouncementPreview
              title={formValues?.title}
              content={formValues?.content}
              audience={formValues?.audience ?? "ALL"}
              pinToTop={formValues?.pinToTop ?? false}
            />
          </div>
        </div>
      )}

      {activeTab === "manage" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ListFilter className="size-4" />
                <span>{initialTotal} thông báo</span>
              </div>
              <TabNavigation
                tabs={STATUS_FILTERS}
                activeTab={statusFilter}
                onTabChange={(v) => setStatusFilter(v as StatusFilter)}
                variant="pill"
              />
            </CardContent>
          </Card>

          <AnnouncementList items={filteredItems} onEdit={handleEdit} />
        </div>
      )}
    </div>
  )
}
