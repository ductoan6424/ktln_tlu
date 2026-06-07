import { CommunityListPage } from "@/components/communities/community-list-page"
import type { CommunityCardItem } from "@/components/communities/community-card"
import { getAuthorizationContext } from "@/lib/auth/authorization"
import { buildCommunityPath } from "@/lib/communities/urls"
import { prisma } from "@/lib/prisma/client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Nhóm" }

const TABS = [
  { label: "Của tôi", value: "my" },
  { label: "Khám phá", value: "explore" },
  { label: "Đang chờ duyệt", value: "pending" },
  { label: "Được mời", value: "invited" },
] as const

type TabValue = (typeof TABS)[number]["value"]

type SearchParams = Record<string, string | string[] | undefined>

function getParam(params: SearchParams, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

function buildTabHref(tab: string, query: string) {
  const search = new URLSearchParams({ tab })
  if (query) search.set("q", query)
  return `/groups?${search.toString()}`
}

function normalizeTab(value: string): TabValue {
  return TABS.some((tab) => tab.value === value) ? (value as TabValue) : "my"
}

export default async function GroupsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const activeTab = normalizeTab(getParam(params, "tab"))
  const query = getParam(params, "q").trim()
  const context = await getAuthorizationContext().catch(() => null)
  const userId = context?.profile.userId ?? null

  const [pendingRequests, invites] = userId
    ? await Promise.all([
        prisma.communityJoinRequest.findMany({
          where: { targetType: "GROUP", requesterId: userId, status: "PENDING" },
          select: { targetId: true },
        }),
        prisma.communityInvite.findMany({
          where: { targetType: "GROUP", inviteeId: userId, status: "PENDING" },
          select: { targetId: true },
        }),
      ])
    : [[], []]

  const pendingIds = new Set(pendingRequests.map((request) => request.targetId))
  const invitedIds = new Set(invites.map((invite) => invite.targetId))
  const filterIds =
    activeTab === "pending"
      ? Array.from(pendingIds)
      : activeTab === "invited"
        ? Array.from(invitedIds)
        : null

  const groups =
    activeTab !== "explore" && !userId
      ? []
      : await prisma.group.findMany({
          where: {
            deletedAt: null,
            ...(query
              ? {
                  OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { description: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
            ...(activeTab === "my" && userId
              ? { members: { some: { userId } } }
              : {}),
            ...(filterIds ? { id: { in: filterIds } } : {}),
          },
          include: {
            members: userId
              ? { where: { userId }, select: { userId: true }, take: 1 }
              : false,
            _count: { select: { members: true } },
          },
          orderBy: { createdAt: "desc" },
        })

  const items: CommunityCardItem[] = groups.map((group) => {
    const href = buildCommunityPath("GROUP", group.name, group.shortId)
    const joined = Array.isArray(group.members) && group.members.length > 0
    return {
      type: "GROUP",
      name: group.name,
      description: group.description,
      href,
      slugId: href.split("/").at(-1) ?? group.shortId,
      visibility: group.communityVisibility,
      memberCount: group._count.members,
      status: joined
        ? "JOINED"
        : pendingIds.has(group.id)
          ? "PENDING"
          : invitedIds.has(group.id)
            ? "INVITED"
            : "AVAILABLE",
    }
  })

  return (
    <CommunityListPage
      title="Nhóm"
      description="Tham gia nhóm để kết nối và học tập cùng nhau."
      searchPlaceholder="Tìm kiếm nhóm..."
      createHref="/groups/new"
      createLabel="Tạo nhóm"
      tabs={TABS.map((tab) => ({
        ...tab,
        href: buildTabHref(tab.value, query),
      }))}
      activeTab={activeTab}
      query={query}
      items={items}
      emptyText="Chưa có nhóm phù hợp."
    />
  )
}
