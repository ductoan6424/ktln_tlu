"use client"

import Link from "next/link"

import { SearchInput } from "@/components/shared/search-input"
import { TabNavigation } from "@/components/shared/tab-navigation"
import type { AdminTabItems } from "@/lib/admin/admin-types"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

interface AdminFilterBarProps {
  activeTab?: string
  onActiveTabChange?: (value: string) => void
  onQueryChange?: (value: string) => void
  query?: string
  tabs?: AdminTabItems
  searchPlaceholder?: string
}

export function AdminFilterBar({
  activeTab,
  onActiveTabChange,
  onQueryChange,
  query,
  tabs = [],
  searchPlaceholder = "Tìm kiếm...",
}: AdminFilterBarProps) {
  const resolvedActiveTab = activeTab ?? ""
  const resolvedQuery = query
  const handleActiveTabChange = onActiveTabChange ?? (() => {})

  if (tabs.length === 0) {
    return (
      <SearchInput
        placeholder={searchPlaceholder}
        value={resolvedQuery}
        onChange={onQueryChange}
      />
    )
  }

  const hasHrefTabs = Boolean(tabs[0]?.href)

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <SearchInput placeholder={searchPlaceholder} value={resolvedQuery} onChange={onQueryChange} />
      {hasHrefTabs ? (
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.value === resolvedActiveTab
            const className = cn(
              buttonVariants({ variant: isActive ? "default" : "secondary", size: "sm" }),
              "rounded-full text-xs font-medium whitespace-nowrap",
            )

            if (tab.href) {
              return (
                <Link
                  key={tab.value}
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={className}
                >
                  {tab.label}
                </Link>
              )
            }

            return (
              <button
                key={tab.value}
                type="button"
                className={className}
                onClick={() => handleActiveTabChange(tab.value)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      ) : (
        <TabNavigation
          tabs={tabs.map((tab) => ({ label: tab.label, value: tab.value }))}
          activeTab={resolvedActiveTab}
          onTabChange={handleActiveTabChange}
          variant="pill"
        />
      )}
    </div>
  )
}
