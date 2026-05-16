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
