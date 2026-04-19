import Link from "next/link"
import { BookOpen, CalendarDays, Settings, Users, UsersRound } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { AdminIconName, AdminQuickAction } from "@/lib/admin/admin-types"

const iconMap: Record<AdminIconName, typeof Users> = {
  Users,
  BookOpen,
  UsersRound,
  CalendarDays,
}

interface AdminActionListProps {
  title?: string
  description?: string
  actions: readonly AdminQuickAction[]
}

export function AdminActionList({
  title = "Tac vu nhanh",
  description = "Cac thao tac pho bien cho module nay.",
  actions,
}: AdminActionListProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-foreground">
            <Settings className="size-4" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="space-y-2">
          {actions.map((action) => {
            const Icon = action.icon ? iconMap[action.icon] : Settings

            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-start gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:bg-muted/60"
              >
                <div className="rounded-md bg-muted p-2 text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  {action.description && (
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
