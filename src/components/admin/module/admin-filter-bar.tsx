"use client"

import Link from "next/link"

import { SearchInput } from "@/components/shared/search-input"
import { TabNavigation } from "@/components/shared/tab-navigation"
import type { AdminTabItems } from "@/lib/admin/admin-types"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

const EMPTY_TABS: AdminTabItems = []

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
  tabs = EMPTY_TABS,
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
        className="w-full"
      />
    )
  }

  const hasHrefTabs = Boolean(tabs[0]?.href)

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:gap-4 sm:p-4">
      <SearchInput placeholder={searchPlaceholder} value={resolvedQuery} onChange={onQueryChange} />
      {hasHrefTabs ? (
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
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
          className="w-full max-w-full"
        />
      )}
    </div>
  )
}
