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

function renderField(field: AdminFieldDefinition) {
  const commonProps = {
    id: field.name,
    name: field.name,
    placeholder: field.placeholder ?? field.label,
    required: field.required,
  }

  if (field.type === "textarea") {
    return <Textarea {...commonProps} />
  }

  if (field.type === "toggle") {
    return <Switch aria-label={field.label} defaultChecked={false} />
  }

  if (field.type === "select") {
    return (
      <select
        id={field.name}
        name={field.name}
        defaultValue=""
        required={field.required}
        className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="" disabled>
          {field.placeholder ?? `Chon ${field.label.toLowerCase()}`}
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
      type={field.type === "number" ? "number" : field.type === "password" ? "password" : field.type === "email" ? "email" : "text"}
    />
  )
}

function getSections(sections: readonly AdminFormSection[]) {
  return sections.map((section) => (
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
              {renderField(field)}
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  ))
}

export function AdminFormPageShell<Cells extends AdminCellValues>({
  module,
  mode,
  record,
}: AdminFormPageShellProps<Cells>) {
  const isCreate = mode === "create"
  const sections = isCreate ? module.createSections : module.editSections
  const title = isCreate ? `Them ${module.entityNameSingular}` : `Cap nhat ${record?.title ?? module.entityNameSingular}`
  const description = isCreate ? module.description : (record?.subtitle ?? module.description)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description={description}
        secondaryActions={[
          { label: "Quay lai danh sach", href: module.paths.list, variant: "outline" },
        ]}
      />
      {getSections(sections)}
      <div className="flex justify-end gap-2">
        <Button variant="outline">Huy</Button>
        <Button>{isCreate ? `Luu ${module.entityNameSingular}` : "Luu thay doi"}</Button>
      </div>
    </div>
  )
}
