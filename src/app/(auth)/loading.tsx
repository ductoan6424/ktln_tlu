import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function AuthRouteLoading() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="items-center gap-3 pb-2 text-center">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="mx-auto h-4 w-36" />
      </CardContent>
    </Card>
  )
}
