import { PageContainer } from "@/components/layout/page-container"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function FeedCardSkeleton() {
  return (
    <Card className="rounded-lg border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-4 px-4 py-4 md:px-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="flex gap-4 border-t border-border pt-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

function ComposerSkeleton() {
  return (
    <Card className="rounded-xl border-border/70 shadow-sm">
      <CardContent className="flex gap-4 p-4">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SidebarSkeleton() {
  return (
    <aside className="hidden flex-col gap-4 xl:flex">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <Skeleton className="h-5 w-32" />
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </CardContent>
      </Card>
    </aside>
  )
}

export default function MainRouteLoading() {
  return (
    <PageContainer variant="full">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 xl:mx-0 xl:max-w-none">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="hidden h-9 w-28 rounded-full sm:block" />
          </div>
          <ComposerSkeleton />
          <FeedCardSkeleton />
          <FeedCardSkeleton />
        </section>
        <SidebarSkeleton />
      </div>
    </PageContainer>
  )
}
