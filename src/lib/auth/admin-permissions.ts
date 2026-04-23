import { prisma } from "@/lib/prisma/client"

export async function hasAdminPermission(
  userId: string,
  permissionCode: string,
): Promise<boolean> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      role: true,
      userAdminRoles: {
        select: {
          adminRole: {
            select: {
              adminRolePermissions: {
                select: {
                  adminPermission: { select: { code: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!profile) return false
  if (profile.role === "ADMIN") return true

  for (const ua of profile.userAdminRoles) {
    for (const arp of ua.adminRole.adminRolePermissions) {
      if (arp.adminPermission.code === permissionCode) return true
    }
  }
  return false
}
