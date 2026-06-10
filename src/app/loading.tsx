import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-full" />
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex gap-4 p-4">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-3">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16 rounded-lg" />
                      <Skeleton className="h-8 w-20 rounded-lg" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {[0, 1].map((item) => (
              <Card key={item}>
                <CardContent className="flex flex-col gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  <Skeleton className="h-40 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>

          <aside className="hidden flex-col gap-4 lg:flex">
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <Skeleton className="h-5 w-28" />
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Skeleton className="h-48 rounded-lg" />
          </aside>
        </div>
      </div>
    </div>
  )
}
