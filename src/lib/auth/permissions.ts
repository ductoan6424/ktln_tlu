// src/lib/auth/permissions.ts
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { AuthError, NotFoundError } from "@/lib/errors"
import type { UserRole } from "@/lib/auth/types"

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new AuthError("Vui lòng đăng nhập")
  }
  return user
}

export async function getCurrentUserRole(): Promise<UserRole> {
  const user = await getCurrentUser()
  if (!user) return "STUDENT"

  const role = user.user_metadata?.role as UserRole | undefined
  return role ?? "STUDENT"
}

export async function requireRole(allowedRoles: UserRole[]) {
  const role = await getCurrentUserRole()
  if (!allowedRoles.includes(role)) {
    throw new AuthError("Bạn không có quyền thực hiện hành động này")
  }
  return role
}

export async function getCurrentUserProfile() {
  const user = await requireAuth()
  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  })
  if (!profile) {
    throw new NotFoundError("Không tìm thấy hồ sơ người dùng")
  }
  return profile
}
