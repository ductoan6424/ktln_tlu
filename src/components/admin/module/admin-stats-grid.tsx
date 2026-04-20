import { Card, CardContent } from "@/components/ui/card"
import type { AdminStatItem } from "@/lib/admin/admin-types"

interface AdminStatsGridProps {
  stats: readonly AdminStatItem[]
}

export function AdminStatsGrid({ stats }: AdminStatsGridProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
            {stat.hint && <p className="text-sm text-muted-foreground">{stat.hint}</p>}
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
