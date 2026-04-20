import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import type { AdminCellValues, AdminModuleDefinition, AdminSettingsItem } from "@/lib/admin/admin-types"

interface AdminSettingsPageShellProps<Cells extends AdminCellValues> {
  module: AdminModuleDefinition<Cells>
}

function getSettingSummary(item: AdminSettingsItem) {
  if (item.type === "toggle") {
    return item.value === "on" ? "Đã bật" : "Đã tắt"
  }

  if (item.type === "select") {
    return item.options.find((option) => option.value === item.value)?.label ?? item.value
  }

  return item.value
}

function renderSettingControl(item: AdminSettingsItem) {
  if (item.type === "toggle") {
    return <Switch aria-label={item.label} defaultChecked={item.value === "on"} />
  }

  if (item.type === "select") {
    return (
      <select
        id={item.name}
        name={item.name}
        defaultValue={item.value}
        className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {item.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <Input
      id={item.name}
      name={item.name}
      type={item.type === "number" ? "number" : "text"}
      defaultValue={item.value}
    />
  )
}

export function AdminSettingsPageShell<Cells extends AdminCellValues>({
  module,
}: AdminSettingsPageShellProps<Cells>) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Cài đặt ${module.entityNameSingular}`}
        description={module.description}
        secondaryActions={[
          { label: "Quay lại danh sách", href: module.paths.list, variant: "outline" },
        ]}
      />

      {module.settingsSections.map((section) => (
        <Card key={section.title}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
            </div>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col gap-3 rounded-lg border border-border/70 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{getSettingSummary(item)}</p>
                  </div>
                  <div className="w-full md:w-56">{renderSettingControl(item)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button>Lưu cài đặt</Button>
      </div>
    </div>
  )
}
