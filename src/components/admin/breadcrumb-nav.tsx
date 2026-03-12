import { ChevronRight } from "lucide-react"
import Link from "next/link"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div key={item.label} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-primary hover:underline underline-offset-4 font-medium"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-muted-foreground font-medium">
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
