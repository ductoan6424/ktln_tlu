import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function AdminStatSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  )
}

export default function AdminRouteLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <AdminStatSkeleton key={item} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-52 rounded-lg" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 p-5">
            <Skeleton className="h-5 w-44" />
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Skeleton className="size-6 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
