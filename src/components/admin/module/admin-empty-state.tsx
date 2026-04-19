import Link from "next/link"
import { Inbox } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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
            <Link href={actionHref} className={cn(buttonVariants({ variant: "outline" }))}>
              {actionLabel}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
