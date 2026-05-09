import Link from "next/link"

import { CommunityCard } from "@/components/communities/community-card"
import { CommunityChatPanel } from "@/components/communities/community-chat-panel"
import { CommunityInviteAcceptButton } from "@/components/communities/community-invite-accept-button"
import { CommunityJoinButton } from "@/components/communities/community-join-button"
import { CommunityPostComposer } from "@/components/communities/community-post-composer"
import { PageContainer } from "@/components/layout/page-container"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CommunityContext } from "@/lib/communities/types"
import type { ChatMessageItem } from "@/types/chat"

type CommunityDetailShellProps = {
  target: CommunityContext
  href: string
  manageHref: string
  description: string | null
  memberCount: number
  canViewPosts: boolean
  canPost: boolean
  canManage: boolean
  joinMode: "NONE" | "JOIN_NOW" | "REQUEST"
  hasPendingInvite?: boolean
  slugId: string
  viewer: { displayName: string; avatarUrl: string | null } | null
  rules: Array<{ id: string; title: string; description: string }>
  chat?: {
    conversationId: string
    canSend: boolean
    readonlyLabel?: string
    messages: ChatMessageItem[]
  } | null
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
  joinMode,
  hasPendingInvite = false,
  slugId,
  viewer,
  rules,
  chat,
}: CommunityDetailShellProps) {
  return (
    <PageContainer variant="centered" className="space-y-6">
      <section className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{target.name}</h1>
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
            {rules.length > 0 ? (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <article key={rule.id} className="rounded-lg border p-4">
                    <h3 className="font-medium">{rule.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Chưa có quy định được công bố.
              </p>
            )}
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
          {canPost && viewer ? (
            <CommunityPostComposer
              type={target.type}
              slugId={slugId}
              targetName={target.name}
              userName={viewer.displayName}
              userAvatar={viewer.avatarUrl}
            />
          ) : null}
          <nav className="flex gap-2 overflow-x-auto border-b border-border pb-3">
            {["Bảng tin", "Thành viên", "Giới thiệu", ...(target.chatEnabled ? ["Chat"] : [])].map((label) => (
              <Button key={label} variant="ghost" size="sm">
                {label}
              </Button>
            ))}
          </nav>
          {chat ? (
            <CommunityChatPanel
              conversationId={chat.conversationId}
              canSend={chat.canSend}
              readonlyLabel={chat.readonlyLabel}
              messages={chat.messages}
            />
          ) : null}
          <div
            id="internal-feed"
            className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground"
          >
            Bảng tin nội bộ sẽ hiển thị ở bước bài viết community.
          </div>
        </div>
      )}
    </PageContainer>
  )
}
