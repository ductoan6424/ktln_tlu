"use client"

import { useEffect, useReducer, useRef } from "react"
import { useRouter } from "next/navigation"
import { Clock3, Search, X } from "lucide-react"
import {
  getRecentSearches,
  recordSearchQuery,
  removeRecentSearch,
  searchSuggestions,
} from "@/actions/search"
import { SearchInput } from "@/components/shared/search-input"
import { UserAvatar } from "@/components/shared/user-avatar"
import { cn } from "@/lib/utils"
import type { SearchSuggestion } from "@/lib/search/types"

type RecentSearch = {
  query: string
  normalizedQuery: string
  lastSearchedAt: Date
}

type GlobalSearchState = {
  query: string
  open: boolean
  loading: boolean
  recent: RecentSearch[]
  suggestions: SearchSuggestion[]
  activeIndex: number
}

type GlobalSearchAction =
  | { type: "queryChanged"; query: string }
  | { type: "setOpen"; open: boolean }
  | { type: "setRecent"; recent: RecentSearch[] }
  | { type: "suggestionsLoaded"; suggestions: SearchSuggestion[] }
  | { type: "moveActive"; activeIndex: number }
  | { type: "removeRecent"; query: string }

const initialGlobalSearchState: GlobalSearchState = {
  query: "",
  open: false,
  loading: false,
  recent: [],
  suggestions: [],
  activeIndex: -1,
}

function globalSearchReducer(
  state: GlobalSearchState,
  action: GlobalSearchAction,
): GlobalSearchState {
  switch (action.type) {
    case "queryChanged": {
      const hasSearchQuery = action.query.trim().length >= 2
      return {
        ...state,
        query: action.query,
        open: true,
        activeIndex: -1,
        loading: hasSearchQuery,
        suggestions: hasSearchQuery ? state.suggestions : [],
      }
    }
    case "setOpen":
      return { ...state, open: action.open }
    case "setRecent":
      return { ...state, recent: action.recent }
    case "suggestionsLoaded":
      return {
        ...state,
        loading: false,
        suggestions: action.suggestions,
        activeIndex: -1,
      }
    case "moveActive":
      return { ...state, activeIndex: action.activeIndex }
    case "removeRecent":
      return {
        ...state,
        recent: state.recent.filter((item) => item.query !== action.query),
      }
  }
}

const TYPE_PARAM = {
  USER: "users",
  POST: "posts",
  GROUP: "groups",
  CLUB: "clubs",
  COURSE: "courses",
  ANNOUNCEMENT: "announcements",
} as const

export function GlobalSearch({
  placeholder = "Tìm kiếm...",
  className,
}: {
  placeholder?: string
  className?: string
}) {
  const { push } = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const [state, dispatch] = useReducer(globalSearchReducer, initialGlobalSearchState)
  const { query, open, loading, recent, suggestions, activeIndex } = state

  const trimmedQuery = query.trim()
  const showRecent = trimmedQuery.length === 0
  const optionCount = showRecent ? recent.length : suggestions.length + 1

  useEffect(() => {
    if (!open || !showRecent) return

    let cancelled = false
    void getRecentSearches().then((result) => {
      if (!cancelled && result.success) {
        dispatch({ type: "setRecent", recent: result.data ?? [] })
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, showRecent])

  useEffect(() => {
    if (!open || showRecent || trimmedQuery.length < 2) return

    let cancelled = false
    const timer = window.setTimeout(() => {
      void searchSuggestions({ query: trimmedQuery }).then((result) => {
        if (cancelled) return
        dispatch({
          type: "suggestionsLoaded",
          suggestions: result.success ? result.data ?? [] : [],
        })
      })
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, showRecent, trimmedQuery])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        dispatch({ type: "setOpen", open: false })
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const goToSearch = async (value: string, type?: keyof typeof TYPE_PARAM) => {
    const nextQuery = value.trim()
    if (!nextQuery) return

    await recordSearchQuery({ query: nextQuery })
    const params = new URLSearchParams({ q: nextQuery })
    if (type) {
      params.set("type", TYPE_PARAM[type])
    }

    push(`/search?${params.toString()}`)
    dispatch({ type: "setOpen", open: false })
  }

  const removeHistoryItem = async (value: string) => {
    await removeRecentSearch({ query: value })
    dispatch({ type: "removeRecent", query: value })
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <SearchInput
        placeholder={placeholder}
        value={query}
        onChange={(value) => {
          dispatch({ type: "queryChanged", query: value })
        }}
        onFocus={() => dispatch({ type: "setOpen", open: true })}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            dispatch({ type: "moveActive", activeIndex: Math.min(activeIndex + 1, optionCount - 1) })
          }

          if (event.key === "ArrowUp") {
            event.preventDefault()
            dispatch({ type: "moveActive", activeIndex: Math.max(activeIndex - 1, -1) })
          }

          if (event.key === "Enter") {
            event.preventDefault()

            if (showRecent && activeIndex >= 0 && recent[activeIndex]) {
              void goToSearch(recent[activeIndex].query)
              return
            }

            if (!showRecent && activeIndex >= 0 && suggestions[activeIndex]) {
              void goToSearch(trimmedQuery, suggestions[activeIndex].type)
              return
            }

            void goToSearch(trimmedQuery)
          }

          if (event.key === "Escape") {
            dispatch({ type: "setOpen", open: false })
          }
        }}
      />

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-md border border-border bg-card shadow-lg">
          {showRecent ? (
            <div role="listbox" aria-label="Lịch sử tìm kiếm">
              {recent.length > 0 ? (
                recent.map((item, index) => (
                  <div
                    key={item.normalizedQuery}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5",
                      activeIndex === index ? "bg-muted" : undefined,
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-sm p-2 text-left text-sm hover:bg-muted"
                      onClick={() => void goToSearch(item.query)}
                    >
                      <Clock3 className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.query}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Xóa ${item.query}`}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => void removeHistoryItem(item.query)}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">Chưa có tìm kiếm gần đây.</p>
              )}
            </div>
          ) : (
            <div role="listbox" aria-label="Gợi ý tìm kiếm">
              {loading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Đang tìm…</p>
              ) : null}

              {suggestions.map((item, index) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted",
                    activeIndex === index ? "bg-muted" : undefined,
                  )}
                  onClick={() => void goToSearch(trimmedQuery, item.type)}
                >
                  <UserAvatar src={item.avatarUrl ?? undefined} name={item.title} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    {item.subtitle ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}

              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 border-t px-4 py-3 text-left text-sm hover:bg-muted",
                  activeIndex === suggestions.length ? "bg-muted" : undefined,
                )}
                onClick={() => void goToSearch(trimmedQuery)}
              >
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">Xem tất cả kết quả cho &quot;{trimmedQuery}&quot;</span>
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
