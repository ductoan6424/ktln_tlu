import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import type { AdminCellValues, AdminFieldDefinition, AdminFormSection, AdminModuleDefinition, AdminRecord } from "@/lib/admin/admin-types"

interface AdminFormPageShellProps<Cells extends AdminCellValues> {
  module: AdminModuleDefinition<Cells>
  mode: "create" | "edit"
  record?: AdminRecord<Cells>
}

function getRecordFieldValue<Cells extends AdminCellValues>(
  field: AdminFieldDefinition,
  record?: AdminRecord<Cells>,
) {
  if (!record) {
    return undefined
  }

  const cells = record.cells as unknown as Record<string, string>

  if (field.name in cells) {
    return cells[field.name]
  }

  if (field.name === "fullName" || field.name === "name" || field.name === "title") {
    return record.title
  }

  if (field.name === "email") {
    return cells.email ?? (record.subtitle?.includes("@") ? record.subtitle : undefined)
  }

  if (field.name === "status") {
    return record.status ?? cells.status
  }

  return undefined
}

function getSelectDefaultValue<Cells extends AdminCellValues>(
  field: Extract<AdminFieldDefinition, { type: "select" }>,
  record?: AdminRecord<Cells>,
) {
  const rawValue = getRecordFieldValue(field, record)

  if (!rawValue) {
    return ""
  }

  const normalizedValue = rawValue.toLowerCase()
  return field.options.find((option) => {
    return option.value.toLowerCase() === normalizedValue || option.label.toLowerCase() === normalizedValue
  })?.value ?? ""
}

function getToggleDefaultValue<Cells extends AdminCellValues>(
  field: Extract<AdminFieldDefinition, { type: "toggle" }>,
  record?: AdminRecord<Cells>,
) {
  const rawValue = getRecordFieldValue(field, record)

  if (!rawValue) {
    return false
  }

  const normalizedValue = rawValue.toLowerCase()
  return normalizedValue === "on" || normalizedValue === "true" || normalizedValue === "active" || normalizedValue === "verified"
}

function FieldControl<Cells extends AdminCellValues>({
  field,
  record,
}: {
  field: AdminFieldDefinition
  record?: AdminRecord<Cells>,
}) {
  const commonProps = {
    id: field.name,
    name: field.name,
    placeholder: field.placeholder ?? field.label,
    required: field.required,
  }

  if (field.type === "textarea") {
    return <Textarea {...commonProps} defaultValue={getRecordFieldValue(field, record)} />
  }

  if (field.type === "toggle") {
    return <Switch aria-label={field.label} defaultChecked={getToggleDefaultValue(field, record)} />
  }

  if (field.type === "select") {
    return (
      <select
        id={field.name}
        name={field.name}
        defaultValue={getSelectDefaultValue(field, record)}
        required={field.required}
        className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="" disabled>
          {field.placeholder ?? `Chọn ${field.label.toLowerCase()}`}
        </option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <Input
      {...commonProps}
      defaultValue={getRecordFieldValue(field, record)}
      type={field.type === "number" ? "number" : field.type === "password" ? "password" : field.type === "email" ? "email" : "text"}
    />
  )
}

function AdminFormSections<Cells extends AdminCellValues>({
  sections,
  record,
}: {
  sections: readonly AdminFormSection[]
  record?: AdminRecord<Cells>
}) {
  return (
    <>
      {sections.map((section) => (
        <Card key={section.title}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {section.fields.map((field) => (
                <label
                  key={field.name}
                  htmlFor={field.name}
                  className={field.type === "textarea" ? "space-y-2 md:col-span-2" : "space-y-2"}
                >
                  <span className="text-sm font-medium text-foreground">
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  <FieldControl field={field} record={record} />
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

export function AdminFormPageShell<Cells extends AdminCellValues>({
  module,
  mode,
  record,
}: AdminFormPageShellProps<Cells>) {
  const isCreate = mode === "create"
  const sections = isCreate ? module.createSections : module.editSections
  const title = isCreate ? `Thêm ${module.entityNameSingular}` : `Cập nhật ${record?.title ?? module.entityNameSingular}`
  const description = isCreate ? module.description : (record?.subtitle ?? module.description)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description={description}
        secondaryActions={[
          { label: "Quay lại danh sách", href: module.paths.list, variant: "outline" },
        ]}
      />
      <AdminFormSections sections={sections} record={record} />
      <div className="flex justify-end gap-2">
        <Button variant="outline">Hủy</Button>
        <Button>{isCreate ? `Tạo ${module.entityNameSingular}` : "Lưu thay đổi"}</Button>
      </div>
    </div>
  )
}
