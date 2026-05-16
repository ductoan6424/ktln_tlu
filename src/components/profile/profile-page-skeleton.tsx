import { PostCardSkeleton } from "@/components/feed/post-card"
import { PostComposerSkeleton } from "@/components/feed/post-composer"
import { PageContainer } from "@/components/layout/page-container"
import { ConnectionsGridSkeleton } from "@/components/profile/connections-grid"
import { ProfileClubGroupCardSkeleton } from "@/components/profile/profile-club-group-card"
import { ProfileHeaderSkeleton } from "@/components/profile/profile-header"
import { ProfileOverviewCardSkeleton } from "@/components/profile/profile-overview-card"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfilePageSkeleton() {
  return (
    <div data-testid="profile-page-skeleton">
      <PageContainer variant="centered" className="space-y-6">
        <ProfileHeaderSkeleton />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="hidden space-y-4 lg:col-span-4 lg:block">
            <ProfileOverviewCardSkeleton />
            <ConnectionsGridSkeleton />
            <ProfileClubGroupCardSkeleton />
          </aside>

          <section className="space-y-4 lg:col-span-8">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex gap-4 border-b border-border pb-4">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <PostComposerSkeleton />
                <PostCardSkeleton />
                <PostCardSkeleton />
              </CardContent>
            </Card>
          </section>
        </div>
      </PageContainer>
    </div>
  )
}
