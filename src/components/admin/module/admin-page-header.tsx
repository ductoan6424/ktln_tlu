import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AdminHeaderAction {
  label: string
  href: string
  variant?: "default" | "outline" | "secondary" | "ghost"
}

interface AdminPageHeaderProps {
  title: string
  description: string
  primaryAction?: AdminHeaderAction
  secondaryActions?: AdminHeaderAction[]
}

export function AdminPageHeader({
  title,
  description,
  primaryAction,
  secondaryActions = [],
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>

      {(primaryAction || secondaryActions.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {secondaryActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(buttonVariants({ variant: action.variant ?? "outline" }))}
            >
              {action.label}
            </Link>
          ))}
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className={cn(buttonVariants({ variant: primaryAction.variant ?? "default" }))}
            >
              {primaryAction.label}
            </Link>
          )}
        </div>
      )}
    </header>
  )
}

export type { AdminHeaderAction }
