import Link from "next/link"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

interface AdminHeaderAction {
  label: string
  href: string
  variant?: "default" | "outline" | "secondary" | "ghost"
}

const EMPTY_ACTIONS: AdminHeaderAction[] = []

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
  secondaryActions = EMPTY_ACTIONS,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>

      {(primaryAction || secondaryActions.length > 0) && (
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          {secondaryActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(buttonVariants({ variant: action.variant ?? "outline" }), "w-full sm:w-auto")}
            >
              {action.label}
            </Link>
          ))}
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className={cn(buttonVariants({ variant: primaryAction.variant ?? "default" }), "w-full sm:w-auto")}
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
