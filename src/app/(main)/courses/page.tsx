import type { CommunityCardItem } from "@/components/communities/community-card"
import { CommunityListPage } from "@/components/communities/community-list-page"
import { getCurrentUserContext } from "@/lib/auth/current-user-context"
import { buildCommunityPath } from "@/lib/communities/urls"
import { prisma } from "@/lib/prisma/client"

export const metadata = { title: "Lớp học" }

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
  return `/courses?${search.toString()}`
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const activeTab = normalizeTab(getParam(params, "tab"))
  const query = getParam(params, "q").trim()
  const context = await getCurrentUserContext()
  const userId = context.userId
  const canCreateCourse = Boolean(
    context.profile && (context.profile.role === "LECTURER" || context.profile.role === "ADMIN"),
  )

  const [pendingRequests, invites] = userId
    ? await Promise.all([
        prisma.communityJoinRequest.findMany({
          where: { targetType: "COURSE", requesterId: userId, status: "PENDING" },
          select: { targetId: true },
        }),
        prisma.communityInvite.findMany({
          where: { targetType: "COURSE", inviteeId: userId, status: "PENDING" },
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

  const courses =
    activeTab !== "explore" && !userId
      ? []
      : await prisma.course.findMany({
          where: {
            deletedAt: null,
            AND: [
              ...(query
                ? [
                    {
                      OR: [
                        { name: { contains: query, mode: "insensitive" as const } },
                        { code: { contains: query, mode: "insensitive" as const } },
                      ],
                    },
                  ]
                : []),
              ...(activeTab === "my" && userId
                ? [
                    {
                      OR: [
                        { members: { some: { userId } } },
                        { lecturerId: userId },
                      ],
                    },
                  ]
                : []),
              ...(filterIds ? [{ id: { in: filterIds } }] : []),
            ],
          },
          include: {
            lecturer: {
              select: { userId: true, displayName: true },
            },
            members: userId
              ? { where: { userId }, select: { userId: true }, take: 1 }
              : false,
            _count: { select: { members: true } },
          },
          orderBy: { createdAt: "desc" },
        })

  const items: CommunityCardItem[] = courses.map((course) => {
    const href = buildCommunityPath("COURSE", course.code, course.shortId)
    const joined =
      course.lecturer.userId === userId ||
      (Array.isArray(course.members) && course.members.length > 0)

    return {
      type: "COURSE",
      name: course.name,
      description: course.description ?? `${course.code} - ${course.lecturer.displayName}`,
      href,
      slugId: href.split("/").at(-1) ?? course.shortId,
      visibility: null,
      memberCount: course._count.members,
      status: joined
        ? "JOINED"
        : pendingIds.has(course.id)
          ? "PENDING"
          : invitedIds.has(course.id)
            ? "INVITED"
            : "AVAILABLE",
    }
  })

  return (
    <CommunityListPage
      title="Lớp học"
      description="Tìm lớp học theo mã hoặc tên lớp và theo dõi thông báo nội bộ."
      searchPlaceholder="Tìm theo mã hoặc tên lớp..."
      createHref={canCreateCourse ? "/courses/new" : undefined}
      createLabel={canCreateCourse ? "Tạo lớp học" : undefined}
      tabs={TABS.map((tab) => ({
        ...tab,
        href: buildTabHref(tab.value, query),
      }))}
      activeTab={activeTab}
      query={query}
      items={items}
      emptyText="Chưa có lớp học phù hợp."
    />
  )
}
