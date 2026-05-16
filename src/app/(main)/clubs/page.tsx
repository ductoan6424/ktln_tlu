import type { CommunityCardItem } from "@/components/communities/community-card"
import { CommunityListPage } from "@/components/communities/community-list-page"
import { getAuthorizationContext } from "@/lib/auth/authorization"
import { buildCommunityPath } from "@/lib/communities/urls"
import { prisma } from "@/lib/prisma/client"

export const dynamic = "force-dynamic"

const TABS = [
  { label: "Của tôi", value: "my" },
  { label: "Khám phá", value: "explore" },
  { label: "Đang chờ duyệt", value: "pending" },
  { label: "Được mời", value: "invited" },
] as const

type SearchParams = Record<string, string | string[] | undefined>
type TabValue = (typeof TABS)[number]["value"]

function getParam(params: SearchParams, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

function normalizeTab(value: string): TabValue {
  return TABS.some((tab) => tab.value === value) ? (value as TabValue) : "my"
}

function buildTabHref(tab: string, query: string) {
  const search = new URLSearchParams({ tab })
  if (query) search.set("q", query)
  return `/clubs?${search.toString()}`
}

export default async function ClubsPage({
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
          where: { targetType: "CLUB", requesterId: userId, status: "PENDING" },
          select: { targetId: true },
        }),
        prisma.communityInvite.findMany({
          where: { targetType: "CLUB", inviteeId: userId, status: "PENDING" },
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

  const clubs =
    activeTab !== "explore" && !userId
      ? []
      : await prisma.club.findMany({
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

  const items: CommunityCardItem[] = clubs.map((club) => {
    const href = buildCommunityPath("CLUB", club.name, club.shortId)
    const joined = Array.isArray(club.members) && club.members.length > 0
    return {
      type: "CLUB",
      name: club.name,
      description: club.description,
      href,
      slugId: href.split("/").at(-1) ?? club.shortId,
      visibility: club.communityVisibility,
      memberCount: club._count.members,
      status: joined
        ? "JOINED"
        : pendingIds.has(club.id)
          ? "PENDING"
          : invitedIds.has(club.id)
            ? "INVITED"
            : "AVAILABLE",
    }
  })

  return (
    <CommunityListPage
      title="Câu lạc bộ"
      description="Theo dõi và tham gia các câu lạc bộ chính thức trong trường."
      searchPlaceholder="Tìm kiếm câu lạc bộ..."
      tabs={TABS.map((tab) => ({
        ...tab,
        href: buildTabHref(tab.value, query),
      }))}
      activeTab={activeTab}
      query={query}
      items={items}
      emptyText="Chưa có câu lạc bộ phù hợp."
    />
  )
}
