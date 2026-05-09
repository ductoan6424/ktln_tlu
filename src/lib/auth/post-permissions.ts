import { cache } from "react"

import { hasAdminPermission } from "@/lib/auth/admin-permissions"
import { isClubAdmin } from "@/lib/auth/club-admin"
import { isGroupAdmin } from "@/lib/auth/group-admin"
import { prisma } from "@/lib/prisma/client"

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

export interface ViewerPostPermissionsCtx {
  viewerId: string | null
  isPostsAdmin: boolean
  groupAdminIds: Set<string>
  clubAdminIds: Set<string>
}

const EMPTY_CTX: ViewerPostPermissionsCtx = {
  viewerId: null,
  isPostsAdmin: false,
  groupAdminIds: new Set(),
  clubAdminIds: new Set(),
}

// Cache theo request để nhiều call site cùng request chia sẻ kết quả
export const loadViewerPostPermissionsCtx = cache(
  async (viewerId: string | null): Promise<ViewerPostPermissionsCtx> => {
    if (!viewerId) return EMPTY_CTX

    const [profile, groupAdminRows, clubAdminRows] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: viewerId },
        select: {
          role: true,
          userAdminRoles: {
            select: {
              adminRole: {
                select: {
                  adminRolePermissions: {
                    select: { adminPermission: { select: { code: true } } },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.groupMember.findMany({
        where: { userId: viewerId, role: "ADMIN" },
        select: { groupId: true },
      }),
      prisma.clubMember.findMany({
        where: { userId: viewerId, role: "ADMIN" },
        select: { clubId: true },
      }),
    ])

    let isPostsAdmin = false
    if (profile) {
      if (profile.role === "ADMIN") {
        isPostsAdmin = true
      } else {
        outer: for (const ua of profile.userAdminRoles) {
          for (const arp of ua.adminRole.adminRolePermissions) {
            if (arp.adminPermission.code === "admin.posts.delete") {
              isPostsAdmin = true
              break outer
            }
          }
        }
      }
    }

    return {
      viewerId,
      isPostsAdmin,
      groupAdminIds: new Set(groupAdminRows.map((row) => row.groupId)),
      clubAdminIds: new Set(clubAdminRows.map((row) => row.clubId)),
    }
  },
)

export function resolveDeleteRoleFromCtx(
  ctx: ViewerPostPermissionsCtx,
  post: PostContext,
): DeleteRole | null {
  if (!ctx.viewerId) return null
  if (post.authorId === ctx.viewerId) return "AUTHOR"
  if (ctx.isPostsAdmin) return "ADMIN"
  if (post.clubId && ctx.clubAdminIds.has(post.clubId)) return "CLUB_ADMIN"
  if (post.groupId && ctx.groupAdminIds.has(post.groupId)) return "GROUP_ADMIN"
  return null
}
