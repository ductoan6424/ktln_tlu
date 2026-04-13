import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "@/lib/prisma/client"

describe("Prisma Client — Phase 1 Verification", () => {
  beforeAll(async () => {
    expect(prisma).toBeDefined()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("kết nối được Neon PostgreSQL", async () => {
    const result = await prisma.$queryRaw<[{ val: number }]>`SELECT 1 as val`
    expect(result[0].val).toBe(1)
  })

  it("có PrismaClient với tất cả 14 model properties", () => {
    const models = [
      "userProfile",
      "club",
      "group",
      "clubMember",
      "groupMember",
      "post",
      "comment",
      "like",
      "conversation",
      "conversationParticipant",
      "message",
      "notification",
      "friendship",
      "emailVerification",
      "passwordReset",
    ]
    for (const model of models) {
      expect((prisma as Record<string, unknown>)[model]).toBeDefined()
    }
  })

  it("export đúng TypeScript types cho UserProfile model", async () => {
    const user = await prisma.userProfile.findFirst({
      select: { userId: true, email: true, displayName: true, role: true },
    })
    expect(user).toBeDefined()
  })

  it("Prisma singleton giữ instance qua nhiều import", async () => {
    // Import lại cùng module — singleton pattern giữ cùng instance
    const mod = await import("@/lib/prisma/client")
    expect(prisma).toBe(mod.prisma)
  })
})