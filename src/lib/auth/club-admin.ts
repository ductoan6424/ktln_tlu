import { prisma } from "@/lib/prisma/client"
import { redis } from "@/lib/redis/client"
import { CLUB_ADMIN_CACHE_TTL_SECONDS } from "@/lib/config/posts"

export async function isClubAdmin(userId: string, clubId: string): Promise<boolean> {
  const key = `club_admin:${userId}:${clubId}`
  try {
    const cached = await redis.get(key)
    if (cached === "1") return true
    if (cached === "0") return false
  } catch {
  }

  const member = await prisma.clubMember.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { role: true },
  })
  const isAdmin = member?.role === "ADMIN"

  try {
    await redis.set(key, isAdmin ? "1" : "0", "EX", CLUB_ADMIN_CACHE_TTL_SECONDS)
  } catch {
  }

  return isAdmin
}
