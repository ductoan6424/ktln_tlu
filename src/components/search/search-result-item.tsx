import Link from "next/link"
import { UserAvatar } from "@/components/shared/user-avatar"
import type { SearchSuggestion } from "@/lib/search/types"

export function SearchResultItem({ item }: { item: SearchSuggestion }) {
  return (
    <Link
      href={item.href}
      className="flex gap-3 border-b py-4 transition-colors hover:bg-muted/40 last:border-b-0"
    >
      <UserAvatar src={item.avatarUrl ?? undefined} name={item.title} size="md" />
      <div className="min-w-0">
        <p className="truncate font-medium">{item.title}</p>
        {item.subtitle ? (
          <p className="truncate text-sm text-muted-foreground">{item.subtitle}</p>
        ) : null}
        {item.excerpt ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
        ) : null}
      </div>
    </Link>
  )
}
