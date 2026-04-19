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

export interface AdminColumnDefinition {
  key: string
  header: string
  width?: string
  align?: "left" | "center" | "right"
}

export interface AdminRecord {
  id: string
  title: string
  subtitle?: string
  href?: string
  status?: string
  metadata?: Record<string, string>
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

export interface AdminFieldDefinition {
  name: string
  label: string
  type: "text" | "email" | "password" | "textarea" | "select" | "toggle" | "number"
  placeholder?: string
  required?: boolean
}

export interface AdminFormSection {
  title: string
  description?: string
  fields: AdminFieldDefinition[]
}

export interface AdminSettingsItem {
  name: string
  label: string
  value: string
  type: "text" | "toggle" | "select" | "number"
}

export interface AdminSettingsSection {
  title: string
  description?: string
  items: AdminSettingsItem[]
}

export interface AdminModuleDefinition<RecordId extends string = string> {
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
  columns: AdminColumnDefinition[]
  records: readonly AdminRecord[]
  quickActions: AdminQuickAction[]
  detailSections: AdminDetailSection[]
  createSections: AdminFormSection[]
  editSections: AdminFormSection[]
  settingsSections: AdminSettingsSection[]
  buildDetailPath: (id: RecordId) => string
  buildEditPath: (id: RecordId) => string
  buildNewPath: () => string
  buildSettingsPath: () => string
  getRecord: (id: RecordId) => AdminRecord | undefined
}
