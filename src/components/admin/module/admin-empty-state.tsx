import Link from "next/link"
import { Inbox } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface AdminEmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export function AdminEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: AdminEmptyStateProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <EmptyState icon={Inbox} title={title} description={description} />
        {actionLabel && actionHref && (
          <div className="flex justify-center">
            <Button variant="outline" asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
