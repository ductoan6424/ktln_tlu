"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { AdminFilterBar } from "@/components/admin/module/admin-filter-bar"
import type { AdminTabItems } from "@/lib/admin/admin-types"

interface AdminUrlFilterBarProps {
  activeTab?: string
  query?: string
  tabs: AdminTabItems
  searchPlaceholder?: string
}

export function AdminUrlFilterBar({
  activeTab,
  query,
  tabs,
  searchPlaceholder,
}: AdminUrlFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [draftQuery, setDraftQuery] = useState(() => ({
    sourceQuery: query ?? "",
    value: query ?? "",
  }))
  const currentParams = useMemo(() => searchParams.toString(), [searchParams])
  const currentQuery = query ?? ""
  const inputQuery = draftQuery.sourceQuery === currentQuery ? draftQuery.value : currentQuery

  function replaceParams(next: { q?: string; tab?: string }) {
    const params = new URLSearchParams(currentParams)

    if (next.q !== undefined) {
      const value = next.q.trim()
      if (value) params.set("q", value)
      else params.delete("q")
    }

    if (next.tab !== undefined) {
      if (next.tab && next.tab !== "all") params.set("tab", next.tab)
      else params.delete("tab")
    }

    const suffix = params.toString()
    startTransition(() => {
      router.replace(suffix ? `${pathname}?${suffix}` : pathname)
    })
  }

  return (
    <AdminFilterBar
      activeTab={activeTab}
      onActiveTabChange={(value) => replaceParams({ tab: value })}
      onQueryChange={(value) => {
        setDraftQuery({ sourceQuery: currentQuery, value })
        replaceParams({ q: value })
      }}
      query={inputQuery}
      tabs={tabs}
      searchPlaceholder={searchPlaceholder}
    />
  )
}
