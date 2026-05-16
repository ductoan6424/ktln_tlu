"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { UserAvatar } from "@/components/shared/user-avatar"
import { cn } from "@/lib/utils"
import { getSearchSuggestions } from "@/actions/search"
import type { SearchUserResult } from "@/actions/search"

interface SearchInputProps {
  placeholder?: string
  className?: string
  autoFocus?: boolean
  onClose?: () => void
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function SearchInput({
  placeholder = "Tìm kiếm...",
  className,
  autoFocus,
  onClose,
}: SearchInputProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SearchUserResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  // Fetch suggestions khi query thay đổi
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    getSearchSuggestions(debouncedQuery).then((result) => {
      if (cancelled) return
      setIsLoading(false)
      if (result.success && result.data) {
        setSuggestions(result.data)
        setIsOpen(result.data.length > 0)
      }
    })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const navigateToSearch = useCallback(
    (q: string) => {
      if (!q.trim()) return
      setIsOpen(false)
      onClose?.()
      router.push(`/search?q=${encodeURIComponent(q.trim())}`)
    },
    [router, onClose],
  )

  const navigateToProfile = useCallback(
    (userId: string) => {
      setIsOpen(false)
      onClose?.()
      router.push(`/profile/${userId}`)
    },
    [router, onClose],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        navigateToProfile(suggestions[activeIndex].userId)
      } else {
        navigateToSearch(query)
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, -1))
      return
    }

    if (e.key === "Escape") {
      setIsOpen(false)
      setActiveIndex(-1)
      inputRef.current?.blur()
    }
  }

  const handleClear = () => {
    setQuery("")
    setSuggestions([])
    setIsOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const roleLabel: Record<string, string> = {
    STUDENT: "Sinh viên",
    LECTURER: "Giảng viên",
    ADMIN: "Quản trị viên",
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-label="Tìm kiếm"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
          className="pl-9 pr-8 bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary/50 h-9 text-sm"
        />
        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Xóa tìm kiếm"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown suggestions */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Gợi ý tìm kiếm"
          className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Đang tìm kiếm...
            </div>
          ) : (
            <>
              {suggestions.map((user, index) => (
                <button
                  key={user.userId}
                  role="option"
                  aria-selected={index === activeIndex}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors",
                    index === activeIndex && "bg-muted",
                  )}
                  onMouseDown={(e) => {
                    // Dùng mousedown để tránh blur input trước khi click
                    e.preventDefault()
                    navigateToProfile(user.userId)
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <UserAvatar
                    src={user.avatarUrl ?? undefined}
                    name={user.displayName}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.major ?? roleLabel[user.role] ?? user.role}
                    </p>
                  </div>
                </button>
              ))}

              {/* Xem tất cả kết quả */}
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary font-medium hover:bg-muted transition-colors border-t border-border"
                onMouseDown={(e) => {
                  e.preventDefault()
                  navigateToSearch(query)
                }}
              >
                <Search className="size-3.5" />
                Tìm kiếm &quot;{query}&quot;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
