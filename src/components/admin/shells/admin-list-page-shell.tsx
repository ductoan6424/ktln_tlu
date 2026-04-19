"use client"

import { useState } from "react"

import {
  AdminDataTable,
} from "@/components/admin/module/admin-data-table"
import { AdminActionList } from "@/components/admin/module/admin-action-list"
import { AdminFilterBar } from "@/components/admin/module/admin-filter-bar"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { AdminStatsGrid } from "@/components/admin/module/admin-stats-grid"
import type { AdminModuleDefinition, AdminCellValues } from "@/lib/admin/admin-types"

interface AdminListPageShellProps<Cells extends AdminCellValues> {
  module: AdminModuleDefinition<Cells>
  activeTab?: string
  onActiveTabChange?: (value: string) => void
  onQueryChange?: (value: string) => void
  query?: string
}

function buildListTitle(entityName: string) {
  return `Quan ly ${entityName}`
}

function buildCreateLabel(entityName: string) {
  return `Them ${entityName}`
}

export function AdminListPageShell<Cells extends AdminCellValues>({
  module,
  activeTab: activeTabProp,
  onActiveTabChange,
  onQueryChange,
  query: queryProp,
}: AdminListPageShellProps<Cells>) {
  const hasHrefTabs = module.tabs.some((tab) => tab.href)
  const defaultTab = module.tabs.find((tab) => tab.active)?.value ?? module.tabs[0]?.value ?? ""
  const [localActiveTab, setLocalActiveTab] = useState(defaultTab)
  const [localQuery, setLocalQuery] = useState("")
  const activeTab = activeTabProp ?? (hasHrefTabs ? "" : localActiveTab)
  const query = queryProp ?? localQuery
  const handleActiveTabChange = hasHrefTabs ? (onActiveTabChange ?? (() => {})) : (onActiveTabChange ?? setLocalActiveTab)
  const handleQueryChange = onQueryChange ?? setLocalQuery

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={buildListTitle(module.entityNameSingular)}
        description={module.description}
        primaryAction={{
          label: buildCreateLabel(module.entityNameSingular),
          href: module.buildNewPath(),
        }}
      />
      <AdminStatsGrid stats={module.stats} />
      <AdminFilterBar
        activeTab={activeTab}
        onActiveTabChange={handleActiveTabChange}
        onQueryChange={handleQueryChange}
        query={query}
        tabs={module.tabs}
        searchPlaceholder={`Tim kiem ${module.entityNamePlural}...`}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminDataTable
          columns={module.columns}
          records={module.records.map((record) => ({
            ...record,
            href: record.href ?? module.buildDetailPath(record.id),
          }))}
          emptyState={{
            title: `Chua co ${module.entityNamePlural}`,
            description: `Bat dau bang cach tao ${module.entityNameSingular} dau tien.`,
            actionLabel: buildCreateLabel(module.entityNameSingular),
            actionHref: module.buildNewPath(),
          }}
        />
        <AdminActionList actions={module.quickActions} />
      </div>
    </div>
  )
}
