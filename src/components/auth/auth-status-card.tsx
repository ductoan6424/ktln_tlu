import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AuthStatusVariant = "success" | "error" | "warning"

interface AuthStatusAction {
  label: string
  href: string
  variant?: "default" | "outline"
}

interface AuthStatusCardProps {
  variant: AuthStatusVariant
  title: string
  description?: React.ReactNode
  actions?: AuthStatusAction[]
  icon?: LucideIcon
}

const VARIANT_STYLES: Record<
  AuthStatusVariant,
  { bg: string; iconColor: string; titleColor: string; defaultIcon: LucideIcon }
> = {
  success: {
    bg: "bg-success-soft",
    iconColor: "text-success",
    titleColor: "text-success",
    defaultIcon: CheckCircle,
  },
  error: {
    bg: "bg-destructive/10",
    iconColor: "text-destructive",
    titleColor: "text-destructive",
    defaultIcon: XCircle,
  },
  warning: {
    bg: "bg-warning-soft",
    iconColor: "text-warning",
    titleColor: "text-warning",
    defaultIcon: AlertCircle,
  },
}

export function AuthStatusCard({
  variant,
  title,
  description,
  actions = [],
  icon,
}: AuthStatusCardProps) {
  const styles = VARIANT_STYLES[variant]
  const Icon = icon ?? styles.defaultIcon

  return (
    <Card className="w-full max-w-md border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-6 p-6 text-center sm:p-8">
        <div className="flex justify-center">
          <div className={cn("flex size-16 items-center justify-center rounded-full", styles.bg)}>
            <Icon className={cn("size-8", styles.iconColor)} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className={cn("text-xl font-semibold", styles.titleColor)}>{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions.length > 0 && (
          <div className="flex flex-col gap-3">
            {actions.map((action) => (
              <Button
                key={action.href}
                className="w-full"
                variant={action.variant ?? "default"}
                render={<Link href={action.href} />}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { AuthStatusVariant, AuthStatusAction }
