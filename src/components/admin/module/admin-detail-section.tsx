import { Card, CardContent } from "@/components/ui/card"
import type { AdminDetailSection as AdminDetailSectionType } from "@/lib/admin/admin-types"

interface AdminDetailSectionProps {
  section: AdminDetailSectionType
}

export function AdminDetailSection({ section }: AdminDetailSectionProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
          {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {section.items.map((item) => (
            <div key={item.label} className="space-y-1 rounded-lg border border-border/70 p-3">
              <dt className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {item.label}
              </dt>
              <dd className="text-sm font-medium text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
