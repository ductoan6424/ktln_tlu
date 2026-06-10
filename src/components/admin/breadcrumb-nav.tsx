import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav className="flex min-w-0 items-center gap-1 overflow-hidden text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div
            key={item.label}
            className={cn(
              "flex min-w-0 items-center gap-1",
              !isLast && "hidden sm:flex",
            )}
          >
            {index > 0 && (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="truncate font-medium text-primary underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate font-medium text-muted-foreground">
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
