import { AdminActionList } from "@/components/admin/module/admin-action-list"
import { AdminDetailSection } from "@/components/admin/module/admin-detail-section"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import type { AdminCellValues, AdminModuleDefinition } from "@/lib/admin/admin-types"

interface AdminDetailPageShellProps<Cells extends AdminCellValues> {
  module: AdminModuleDefinition<Cells>
  recordId: string
}

export function AdminDetailPageShell<Cells extends AdminCellValues>({
  module,
  recordId,
}: AdminDetailPageShellProps<Cells>) {
  const record = module.getRecord(recordId)
  const sections = module.getDetailSections(recordId) ?? []

  if (!record) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title={`Chi tiết ${module.entityNameSingular}`}
          description={module.description}
          secondaryActions={[
            { label: "Quay lại danh sách", href: module.paths.list, variant: "outline" },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={record.title}
        description={record.subtitle ?? module.description}
        primaryAction={{ label: `Chỉnh sửa ${module.entityNameSingular}`, href: module.buildEditPath(record.id) }}
        secondaryActions={[
          { label: "Cài đặt", href: module.buildSettingsPath(), variant: "outline" },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {sections.map((section) => (
            <AdminDetailSection key={section.title} section={section} />
          ))}
        </div>
        <AdminActionList actions={module.quickActions} />
      </div>
    </div>
  )
}
