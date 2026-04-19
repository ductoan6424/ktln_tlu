"use client"

import { useState } from "react"

import { SearchInput } from "@/components/shared/search-input"
import { TabNavigation } from "@/components/shared/tab-navigation"
import type { AdminTabItem } from "@/lib/admin/admin-types"

interface AdminFilterBarProps {
  tabs?: AdminTabItem[]
  searchPlaceholder?: string
}

export function AdminFilterBar({
  tabs = [],
  searchPlaceholder = "Tim kiem...",
}: AdminFilterBarProps) {
  const [query, setQuery] = useState("")
  const defaultTab = tabs.find((tab) => tab.active)?.value ?? tabs[0]?.value ?? ""
  const [activeTab, setActiveTab] = useState(defaultTab)

  if (tabs.length === 0) {
    return <SearchInput placeholder={searchPlaceholder} value={query} onChange={setQuery} />
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <SearchInput placeholder={searchPlaceholder} value={query} onChange={setQuery} />
      <TabNavigation
        tabs={tabs.map((tab) => ({ label: tab.label, value: tab.value }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="pill"
      />
    </div>
  )
}
