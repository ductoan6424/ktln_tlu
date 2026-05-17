import Link from "next/link"

import {
  CommunityCard,
  type CommunityCardItem,
} from "@/components/communities/community-card"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"

type CommunityListTab = {
  label: string
  value: string
  href: string
}

type CommunityListPageProps = {
  title: string
  description: string
  searchPlaceholder: string
  createHref?: string
  createLabel?: string
  tabs: CommunityListTab[]
  activeTab: string
  query: string
  items: CommunityCardItem[]
  emptyText: string
}

export function CommunityListPage({
  title,
  description,
  searchPlaceholder,
  createHref,
  createLabel,
  tabs,
  activeTab,
  query,
  items,
  emptyText,
}: CommunityListPageProps) {
  return (
    <PageContainer variant="centered" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {createHref && createLabel ? (
          <Link href={createHref}>
            <Button>{createLabel}</Button>
          </Link>
        ) : null}
      </div>

      <div className="space-y-4">
        <form className="max-w-sm">
          <input
            name="q"
            defaultValue={query}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>

        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link key={tab.value} href={tab.href}>
              <Button
                size="sm"
                variant={activeTab === tab.value ? "default" : "secondary"}
                className="rounded-full whitespace-nowrap"
              >
                {tab.label}
              </Button>
            </Link>
          ))}
        </nav>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <CommunityCard key={`${item.type}-${item.href}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      )}
    </PageContainer>
  )
}
