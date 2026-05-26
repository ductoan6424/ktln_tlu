import Link from "next/link"
import type { ReactNode } from "react"
import { MessageCircle } from "lucide-react"

import { CommunityCard } from "@/components/communities/community-card"
import { CommunityFeedClient } from "@/components/communities/community-feed-client"
import { CommunityInviteAcceptButton } from "@/components/communities/community-invite-accept-button"
import { CommunityJoinButton } from "@/components/communities/community-join-button"
import { CommunityInviteForm } from "@/components/communities/manage/community-invite-form"
import { CommunityMembersPanel } from "@/components/communities/manage/community-members-panel"
import { CommunityPostComposer } from "@/components/communities/community-post-composer"
import { PageContainer } from "@/components/layout/page-container"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CommunityContext } from "@/lib/communities/types"
import type { FeedPostDto } from "@/lib/feed/queries"

export type CommunityDetailTab =
  | "feed"
  | "members"
  | "about"
  | "chat"
  | "announcements"
  | "assignments"

type CommunityDetailMemberItem = {
  userId: string
  displayName: string
  avatarUrl: string | null
  email?: string | null
  studentId: string | null
  role: "ADMIN" | "MODERATOR" | "MEMBER" | "STUDENT"
  joinedAt: Date
}

type CommunityDetailShellProps = {
  target: CommunityContext
  href: string
  manageHref: string
  description: string | null
  memberCount: number
  canViewPosts: boolean
  canPost: boolean
  canManage: boolean
  canInvite: boolean
  joinMode: "NONE" | "JOIN_NOW" | "REQUEST"
  hasPendingInvite?: boolean
  slugId: string
  activeTab: CommunityDetailTab
  viewer: { userId: string; displayName: string; avatarUrl: string | null } | null
  rules: Array<{ id: string; title: string; description: string }>
  members: CommunityDetailMemberItem[]
  posts: FeedPostDto[]
  chat?: {
    conversationId: string
    canSend: boolean
    readonlyLabel?: string
  } | null
  learningPanels?: {
    announcements: ReactNode
    assignments: ReactNode
  }
}

function RulesList({
  rules,
}: {
  rules: Array<{ id: string; title: string; description: string }>
}) {
  if (rules.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Chưa có quy định được công bố.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <article key={rule.id} className="rounded-lg border p-4">
          <h3 className="font-medium">{rule.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
        </article>
      ))}
    </div>
  )
}

export function CommunityDetailShell({
  target,
  href,
  manageHref,
  description,
  memberCount,
  canViewPosts,
  canPost,
  canManage,
  canInvite,
  joinMode,
  hasPendingInvite = false,
  slugId,
  activeTab,
  viewer,
  rules,
  members,
  posts,
  chat,
  learningPanels,
}: CommunityDetailShellProps) {
  const tabs: Array<{ value: CommunityDetailTab; label: string }> = [
    { value: "feed", label: "Bảng tin" },
    { value: "members", label: "Thành viên" },
    { value: "about", label: "Giới thiệu" },
    ...(target.type === "COURSE" && learningPanels
      ? [
          { value: "announcements" as const, label: "Thông báo" },
          { value: "assignments" as const, label: "Bai tap" },
        ]
      : []),
    ...(target.chatEnabled
      ? [{ value: "chat" as const, label: "Tin nhắn" }]
      : []),
  ]
  const resolvedActiveTab =
    activeTab === "chat" && !target.chatEnabled
      ? "feed"
      : (activeTab === "announcements" || activeTab === "assignments") &&
          (!learningPanels || target.type !== "COURSE")
        ? "feed"
        : activeTab

  return (
    <PageContainer variant="centered" className="space-y-6">
      <section className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{target.name}</h1>
              {target.visibility ? (
                <Badge variant="outline">
                  {target.visibility === "PRIVATE" ? "Riêng tư" : "Công khai"}
                </Badge>
              ) : (
                <Badge variant="outline">Lớp học</Badge>
              )}
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {description ?? "Chưa có mô tả."}
            </p>
            <p className="text-sm text-muted-foreground">{memberCount} thành viên</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {hasPendingInvite && (target.type === "GROUP" || target.type === "CLUB") ? (
              <CommunityInviteAcceptButton type={target.type} slugId={slugId} />
            ) : joinMode !== "NONE" ? (
              <CommunityJoinButton type={target.type} slugId={slugId} mode={joinMode} />
            ) : null}
            {canManage ? (
              <Link href={manageHref}>
                <Button variant="outline">Quản lý</Button>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!canViewPosts ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Quy định</h2>
            <RulesList rules={rules} />
          </section>
          <aside>
            <CommunityCard
              item={{
                type: target.type,
                name: target.name,
                description,
                href,
                slugId,
                visibility: target.visibility,
                memberCount,
                status: joinMode === "NONE" ? "JOINED" : "AVAILABLE",
              }}
            />
          </aside>
        </div>
      ) : (
        <div className="space-y-4">
          <nav className="flex gap-2 overflow-x-auto border-b border-border pb-3">
            {tabs.map((tab) => (
              <Link
                key={tab.value}
                href={tab.value === "feed" ? href : `${href}?tab=${tab.value}`}
              >
                <Button
                  variant={resolvedActiveTab === tab.value ? "default" : "ghost"}
                  size="sm"
                  aria-current={resolvedActiveTab === tab.value ? "page" : undefined}
                >
                  {tab.label}
                </Button>
              </Link>
            ))}
          </nav>

          {resolvedActiveTab === "feed" && canPost && viewer ? (
            <CommunityPostComposer
              type={target.type}
              slugId={slugId}
              targetName={target.name}
              userName={viewer.displayName}
              userAvatar={viewer.avatarUrl}
            />
          ) : null}

          {resolvedActiveTab === "members" ? (
            <div className="space-y-4">
              {canInvite && (target.type === "GROUP" || target.type === "CLUB") ? (
                <CommunityInviteForm type={target.type} slugId={slugId} />
              ) : null}
              <CommunityMembersPanel
                members={members}
                targetType={target.type}
                slugId={slugId}
                managerId={viewer?.userId ?? null}
                canManageActions={canManage}
              />
            </div>
          ) : null}

          {resolvedActiveTab === "about" ? (
            <section className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <h2 className="text-lg font-semibold">Giới thiệu</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {description ?? "Chưa có mô tả."}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {memberCount} thành viên
                </p>
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Quy định</h2>
                <RulesList rules={rules} />
              </div>
            </section>
          ) : null}

          {resolvedActiveTab === "announcements" ? learningPanels?.announcements : null}

          {resolvedActiveTab === "assignments" ? learningPanels?.assignments : null}

          {resolvedActiveTab === "chat" && chat ? (
            <section className="rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MessageCircle className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Tin nhắn cộng đồng</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {chat.canSend
                        ? "Tiếp tục trao đổi trong trang Tin nhắn."
                        : chat.readonlyLabel ?? "Phòng chat hiện ở chế độ chỉ đọc."}
                    </p>
                  </div>
                </div>
                <Link href={`/messages?conversation=${encodeURIComponent(chat.conversationId)}`}>
                  <Button className="w-full gap-2 sm:w-auto">
                    <MessageCircle className="size-4" />
                    Mở trong Tin nhắn
                  </Button>
                </Link>
              </div>
            </section>
          ) : null}

          {resolvedActiveTab === "feed" ? (
            <CommunityFeedClient posts={posts} currentUser={viewer} />
          ) : null}
        </div>
      )}
    </PageContainer>
  )
}
