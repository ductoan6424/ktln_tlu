import Link from "next/link"
import { SearchResultItem } from "@/components/search/search-result-item"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import type { SearchEntityType, SearchResultsPayload } from "@/lib/search/types"

const TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Người dùng", value: "users" },
  { label: "Bài viết", value: "posts" },
  { label: "Nhóm", value: "groups" },
  { label: "Câu lạc bộ", value: "clubs" },
  { label: "Lớp học", value: "courses" },
  { label: "Thông báo", value: "announcements" },
] as const

const LABEL_BY_TYPE: Record<SearchEntityType, string> = {
  USER: "Người dùng",
  POST: "Bài viết",
  GROUP: "Nhóm",
  CLUB: "Câu lạc bộ",
  COURSE: "Lớp học",
  ANNOUNCEMENT: "Thông báo",
}

function buildSearchHref(query: string, type: string, page?: number) {
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  params.set("type", type)
  if (page && page > 1) params.set("page", String(page))
  return `/search?${params.toString()}`
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
  return (
    <PageContainer variant="centered" className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Kết quả tìm kiếm</h1>
        <p className="text-sm text-muted-foreground">
          {query ? `Kết quả cho "${query}"` : "Nhập từ khóa để bắt đầu tìm kiếm."}
        </p>
      </div>

      <nav className="flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <Link key={tab.value} href={buildSearchHref(query, tab.value)}>
            <Button
              size="sm"
              variant={activeType === tab.value ? "default" : "secondary"}
              className="rounded-full whitespace-nowrap"
            >
              {tab.label}
            </Button>
          </Link>
        ))}
      </nav>

      {Object.keys(groups).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groups).map(([type, group]) => (
            <section key={type} className="space-y-3">
              <h2 className="text-lg font-semibold">{LABEL_BY_TYPE[type as SearchEntityType]}</h2>
              <div className="rounded-md border bg-card px-4">
                {group.items.length > 0 ? (
                  group.items.map((item) => (
                    <SearchResultItem key={`${item.type}-${item.id}`} item={item} />
                  ))
                ) : (
                  <p className="py-4 text-sm text-muted-foreground">Không có kết quả.</p>
                )}
              </div>
              {activeType !== "all" ? (
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
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Chưa có kết quả để hiển thị.
        </div>
      )}
    </PageContainer>
  )
}
