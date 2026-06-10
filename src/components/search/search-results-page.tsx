import Link from "next/link"
import {
  Bell,
  BookOpen,
  FileText,
  GraduationCap,
  Search,
  Users,
} from "lucide-react"
import { SearchResultItem } from "@/components/search/search-result-item"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  SearchEntityType,
  SearchResultGroup,
  SearchResultsPayload,
} from "@/lib/search/types"
import type { LucideIcon } from "lucide-react"

const FILTERS: {
  label: string
  value: string
  icon: LucideIcon
  emptyLabel: string
  type?: SearchEntityType
}[] = [
  { label: "Tất cả", value: "all", icon: Search, emptyLabel: "kết quả" },
  { label: "Người dùng", value: "users", icon: Users, emptyLabel: "người dùng", type: "USER" },
  { label: "Bài viết", value: "posts", icon: FileText, emptyLabel: "bài viết", type: "POST" },
  { label: "Nhóm", value: "groups", icon: Users, emptyLabel: "nhóm", type: "GROUP" },
  { label: "Câu lạc bộ", value: "clubs", icon: GraduationCap, emptyLabel: "câu lạc bộ", type: "CLUB" },
  { label: "Lớp học", value: "courses", icon: BookOpen, emptyLabel: "lớp học", type: "COURSE" },
  { label: "Thông báo", value: "announcements", icon: Bell, emptyLabel: "thông báo", type: "ANNOUNCEMENT" },
]

const DEFAULT_FILTER = FILTERS[0]!

const LABEL_BY_TYPE: Record<SearchEntityType, string> = {
  USER: "Người dùng",
  POST: "Bài viết",
  GROUP: "Nhóm",
  CLUB: "Câu lạc bộ",
  COURSE: "Lớp học",
  ANNOUNCEMENT: "Thông báo",
}

const TYPE_TO_FILTER: Record<SearchEntityType, string> = {
  USER: "users",
  POST: "posts",
  GROUP: "groups",
  CLUB: "clubs",
  COURSE: "courses",
  ANNOUNCEMENT: "announcements",
}

function buildSearchHref(query: string, type: string, page?: number) {
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  params.set("type", type)
  if (page && page > 1) params.set("page", String(page))
  return `/search?${params.toString()}`
}

function SearchFilters({
  query,
  activeType,
  className,
}: {
  query: string
  activeType: string
  className?: string
}) {
  return (
    <nav aria-label="Bộ lọc kết quả tìm kiếm" className={className}>
      {FILTERS.map((filter) => {
        const Icon = filter.icon
        const active = activeType === filter.value

        return (
          <Link
            key={filter.value}
            href={buildSearchHref(query, filter.value)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
            )}
          >
            <span
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="whitespace-nowrap">{filter.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function EmptySearchState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed bg-card py-12 text-center">
      <p className="text-sm font-medium">{message}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Thử từ khóa khác hoặc chọn bộ lọc khác để mở rộng kết quả.
      </p>
    </div>
  )
}

export function SearchResultsPage({
  query,
  activeType,
  groups,
}: {
  query: string
  activeType: string
  groups: SearchResultsPayload
}) {
  const isAll = activeType === "all"
  const activeFilter = FILTERS.find((filter) => filter.value === activeType) ?? DEFAULT_FILTER
  const entries = Object.entries(groups) as [SearchEntityType, SearchResultGroup][]
  const visibleEntries = isAll
    ? entries.filter(([, group]) => group.items.length > 0)
    : entries.filter(([type]) => !activeFilter.type || type === activeFilter.type)
  const hasResults = visibleEntries.some(([, group]) => group.items.length > 0)
  const emptyMessage = isAll
    ? "Không tìm thấy kết quả phù hợp."
    : `Không có kết quả ${activeFilter.emptyLabel} phù hợp.`

  return (
    <PageContainer variant="full" className="py-4 lg:py-6">
      <div className="flex gap-5 lg:gap-6">
        <aside className="hidden shrink-0 lg:block lg:w-[280px] xl:w-[300px]">
          <div className="sticky top-20 space-y-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Tìm kiếm</h1>
              <p className="text-sm text-muted-foreground">
                Lọc kết quả theo loại nội dung.
              </p>
            </div>
            <SearchFilters query={query} activeType={activeType} className="space-y-1" />
          </div>
        </aside>

        <section className="min-w-0 flex-1 space-y-5">
          <div className="max-w-3xl mx-auto w-full space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Kết quả tìm kiếm</p>
              <h2 className="text-2xl font-semibold">
                {query ? `Kết quả cho "${query}"` : "Nhập từ khóa để bắt đầu tìm kiếm."}
              </h2>
            </div>

            <SearchFilters
              query={query}
              activeType={activeType}
              className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
            />

            {hasResults ? (
              <div className="space-y-5">
                {visibleEntries.map(([type, group]) => (
                  <section key={type} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">{LABEL_BY_TYPE[type]}</h3>
                      {isAll && group.hasMore ? (
                        <Link
                          href={buildSearchHref(query, TYPE_TO_FILTER[type])}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Xem tất cả
                        </Link>
                      ) : null}
                    </div>
                    <div className="rounded-md border bg-card px-4">
                      {group.items.map((item) => (
                        <SearchResultItem key={`${item.type}-${item.id}`} item={item} />
                      ))}
                    </div>
                    {!isAll ? (
                      <div className="flex gap-2">
                        {group.page > 1 ? (
                          <Link href={buildSearchHref(query, activeType, group.page - 1)}>
                            <Button variant="secondary" size="sm">
                              Trang trước
                            </Button>
                          </Link>
                        ) : null}
                        {group.hasMore ? (
                          <Link href={buildSearchHref(query, activeType, group.page + 1)}>
                            <Button variant="secondary" size="sm">
                              Trang sau
                            </Button>
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : (
              <EmptySearchState message={emptyMessage} />
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  )
}
