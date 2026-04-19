export type AdminModuleKey = "users" | "subjects" | "groups" | "events"

export type AdminIconName = "Users" | "BookOpen" | "UsersRound" | "CalendarDays"

export interface AdminBreadcrumbItem {
  label: string
  href?: string
}

export interface AdminModulePaths {
  list: string
  create: string
  settings: string
  detail: string
  edit: string
}

export interface AdminNavItem {
  label: string
  href: string
  icon: AdminIconName
  description?: string
}

export interface AdminStatItem {
  label: string
  value: string
  hint?: string
}

export interface AdminTabItem {
  label: string
  value: string
  href?: string
  active?: boolean
}

export interface AdminSelectOption {
  label: string
  value: string
}

export interface AdminCellValues {
  title: string
}

export interface AdminColumnDefinition<Cells extends AdminCellValues = AdminCellValues> {
  key: keyof Cells & string
  header: string
  width?: string
  align?: "left" | "center" | "right"
}

export interface AdminRecord<Cells extends AdminCellValues = AdminCellValues> {
  id: string
  title: string
  subtitle?: string
  href?: string
  status?: string
  cells: Cells
}

export interface AdminDetailItem {
  label: string
  value: string
}

export interface AdminDetailSection {
  title: string
  description?: string
  items: AdminDetailItem[]
}

export interface AdminQuickAction {
  label: string
  href: string
  icon?: AdminIconName
  description?: string
}

interface AdminBaseFieldDefinition {
  name: string
  label: string
  placeholder?: string
  required?: boolean
}

interface AdminInputFieldDefinition extends AdminBaseFieldDefinition {
  type: "text" | "email" | "password" | "textarea" | "number"
}

interface AdminToggleFieldDefinition extends AdminBaseFieldDefinition {
  type: "toggle"
}

interface AdminSelectFieldDefinition extends AdminBaseFieldDefinition {
  type: "select"
  options: readonly AdminSelectOption[]
}

export type AdminFieldDefinition =
  | AdminInputFieldDefinition
  | AdminToggleFieldDefinition
  | AdminSelectFieldDefinition

export interface AdminFormSection {
  title: string
  description?: string
  fields: AdminFieldDefinition[]
}

interface AdminBaseSettingsItem {
  name: string
  label: string
  value: string
}

interface AdminInputSettingsItem extends AdminBaseSettingsItem {
  type: "text" | "number"
}

interface AdminToggleSettingsItem extends AdminBaseSettingsItem {
  type: "toggle"
  value: "on" | "off"
}

interface AdminSelectSettingsItem extends AdminBaseSettingsItem {
  type: "select"
  options: readonly AdminSelectOption[]
}

export type AdminSettingsItem =
  | AdminInputSettingsItem
  | AdminToggleSettingsItem
  | AdminSelectSettingsItem

export interface AdminSettingsSection {
  title: string
  description?: string
  items: AdminSettingsItem[]
}

export interface AdminModuleDefinition<
  Cells extends AdminCellValues = AdminCellValues,
  RecordId extends string = string,
> {
  key: AdminModuleKey
  label: string
  description: string
  basePath: string
  icon: AdminIconName
  entityNameSingular: string
  entityNamePlural: string
  paths: AdminModulePaths
  navItem: AdminNavItem
  stats: AdminStatItem[]
  tabs: AdminTabItem[]
  columns: AdminColumnDefinition<Cells>[]
  records: readonly AdminRecord<Cells>[]
  quickActions: AdminQuickAction[]
  getDetailSections: (id: RecordId) => AdminDetailSection[] | undefined
  createSections: AdminFormSection[]
  editSections: AdminFormSection[]
  settingsSections: AdminSettingsSection[]
  buildDetailPath: (id: RecordId) => string
  buildEditPath: (id: RecordId) => string
  buildNewPath: () => string
  buildSettingsPath: () => string
  getRecord: (id: RecordId) => AdminRecord<Cells> | undefined
}
