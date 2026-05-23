import { prisma } from "@/lib/prisma/client"
import { hasAdminPermission } from "@/lib/auth/admin-permissions"
import { isClubAdmin } from "@/lib/auth/club-admin"
import { isGroupAdmin } from "@/lib/auth/group-admin"

export interface PostContext {
  postId: string
  authorId: string
  clubId: string | null
  groupId: string | null
}

export type DeleteRole = "AUTHOR" | "ADMIN" | "CLUB_ADMIN" | "GROUP_ADMIN"

export async function canDeletePost(userId: string, post: PostContext): Promise<boolean> {
  if (post.authorId === userId) return true
  if (await hasAdminPermission(userId, "admin.posts.delete")) return true
  if (post.clubId && (await isClubAdmin(userId, post.clubId))) return true
  if (post.groupId && (await isGroupAdmin(userId, post.groupId))) return true
  return false
}

export function canHidePost(userId: string, post: PostContext): boolean {
  return post.authorId !== userId
}

export async function resolveDeleteRole(
  userId: string,
  post: PostContext,
): Promise<DeleteRole | null> {
  if (post.authorId === userId) return "AUTHOR"
  if (await hasAdminPermission(userId, "admin.posts.delete")) return "ADMIN"
  if (post.clubId && (await isClubAdmin(userId, post.clubId))) return "CLUB_ADMIN"
  if (post.groupId && (await isGroupAdmin(userId, post.groupId))) return "GROUP_ADMIN"
  return null
}

export async function resolveDeleteRolesBatch(
  userId: string,
  posts: PostContext[],
): Promise<Map<string, DeleteRole | null>> {
  const result = new Map<string, DeleteRole | null>()
  if (posts.length === 0) return result

  const candidatesForElevatedRole = posts.filter((p) => p.authorId !== userId)
  if (candidatesForElevatedRole.length === 0) {
    for (const post of posts) {
      result.set(post.postId, "AUTHOR")
    }
    return result
  }

  const isAdmin = await hasAdminPermission(userId, "admin.posts.delete")

  const clubIds = isAdmin
    ? []
    : Array.from(
        new Set(
          candidatesForElevatedRole
            .map((p) => p.clubId)
            .filter((id): id is string => Boolean(id)),
        ),
      )

  const groupIds = isAdmin
    ? []
    : Array.from(
        new Set(
          candidatesForElevatedRole
            .map((p) => p.groupId)
            .filter((id): id is string => Boolean(id)),
        ),
      )

  const [clubAdminRows, groupAdminRows] = await Promise.all([
    clubIds.length > 0
      ? prisma.clubMember.findMany({
          where: { userId, clubId: { in: clubIds }, role: "ADMIN" },
          select: { clubId: true },
        })
      : Promise.resolve([] as { clubId: string }[]),
    groupIds.length > 0
      ? prisma.groupMember.findMany({
          where: { userId, groupId: { in: groupIds }, role: "ADMIN" },
          select: { groupId: true },
        })
      : Promise.resolve([] as { groupId: string }[]),
  ])

  const clubAdminSet = new Set(clubAdminRows.map((row) => row.clubId))
  const groupAdminSet = new Set(groupAdminRows.map((row) => row.groupId))

  for (const post of posts) {
    if (post.authorId === userId) {
      result.set(post.postId, "AUTHOR")
      continue
    }
    if (isAdmin) {
      result.set(post.postId, "ADMIN")
      continue
    }
    if (post.clubId && clubAdminSet.has(post.clubId)) {
      result.set(post.postId, "CLUB_ADMIN")
      continue
    }
    if (post.groupId && groupAdminSet.has(post.groupId)) {
      result.set(post.postId, "GROUP_ADMIN")
      continue
    }
    result.set(post.postId, null)
  }

  return result
}
