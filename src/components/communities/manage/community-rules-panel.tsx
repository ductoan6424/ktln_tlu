import { Card, CardContent } from "@/components/ui/card"

type CommunityRuleItem = {
  id: string
  title: string
  description: string
  position: number
}

export function CommunityRulesPanel({ rules }: { rules: CommunityRuleItem[] }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="font-semibold">Quy định</h2>
          <p className="text-sm text-muted-foreground">
            Các quy định thành viên phải đồng ý trước khi tham gia.
          </p>
        </div>

        {rules.length > 0 ? (
          <div className="space-y-3">
            {rules.map((rule) => (
              <article key={rule.id} className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">#{rule.position + 1}</p>
                <h3 className="font-medium">{rule.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Chưa có quy định nào.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
