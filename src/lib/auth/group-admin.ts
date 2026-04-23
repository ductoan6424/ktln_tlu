import { prisma } from "@/lib/prisma/client"
import { redis } from "@/lib/redis/client"
import { CLUB_ADMIN_CACHE_TTL_SECONDS } from "@/lib/config/posts"

export async function isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
  const key = `group_admin:${userId}:${groupId}`
  try {
    const cached = await redis.get(key)
    if (cached === "1") return true
    if (cached === "0") return false
  } catch {
  }

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { role: true },
  })
  const isAdmin = member?.role === "ADMIN"

  try {
    await redis.set(key, isAdmin ? "1" : "0", "EX", CLUB_ADMIN_CACHE_TTL_SECONDS)
  } catch {
  }

  return isAdmin
}
