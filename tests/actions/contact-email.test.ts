import { beforeEach, describe, expect, it, vi } from "vitest"

const createClient = vi.hoisted(() => vi.fn())
const sendContactEmailVerificationEmail = vi.hoisted(() => vi.fn())
const sendContactEmailVerifiedEmail = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: {
    findUnique: vi.fn(),
  },
  userContactEmail: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  userContactEmailVerification: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma)),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

vi.mock("@/lib/email/sender", () => ({
  sendContactEmailVerificationEmail,
  sendContactEmailVerifiedEmail,
}))

import {
  requestContactEmailVerification,
  verifyContactEmail,
} from "@/actions/contact-email"

beforeEach(() => {
  vi.clearAllMocks()
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
  })
  prisma.userProfile.findUnique.mockResolvedValue({
    userId: "user-1",
    email: "sv0001@thanglong.edu.vn",
    displayName: "Nguyen Van A",
  })
  prisma.userContactEmail.findUnique.mockResolvedValue(null)
  prisma.userContactEmailVerification.findFirst.mockResolvedValue(null)
  prisma.userContactEmailVerification.deleteMany.mockResolvedValue({ count: 0 })
  prisma.userContactEmailVerification.create.mockResolvedValue({ id: "verification-1" })
  sendContactEmailVerificationEmail.mockResolvedValue(undefined)
  sendContactEmailVerifiedEmail.mockResolvedValue(undefined)
})

describe("requestContactEmailVerification", () => {
  it("rejects the institutional email as a contact email", async () => {
    const result = await requestContactEmailVerification("sv0001@thanglong.edu.vn")

    expect(result.success).toBe(false)
    expect(result.code).toBe("CONTACT_EMAIL_MUST_BE_REAL")
    expect(sendContactEmailVerificationEmail).not.toHaveBeenCalled()
  })

  it("creates a 24h verification and sends the raw token only by email", async () => {
    const result = await requestContactEmailVerification("real@example.com")

    expect(result.success).toBe(true)
    expect(prisma.userContactEmailVerification.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", consumedAt: null },
    })
    expect(prisma.userContactEmailVerification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        email: "real@example.com",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      },
    })
    expect(sendContactEmailVerificationEmail).toHaveBeenCalledWith(
      "real@example.com",
      "Nguyen Van A",
      expect.any(String),
    )
    const tokenSent = sendContactEmailVerificationEmail.mock.calls[0]![2]
    const tokenHashStored = prisma.userContactEmailVerification.create.mock.calls[0]![0].data.tokenHash
    expect(tokenHashStored).not.toBe(tokenSent)
  })
})

describe("verifyContactEmail", () => {
  it("stores verified contact email and consumes the token", async () => {
    const future = new Date(Date.now() + 60_000)
    prisma.userContactEmailVerification.findUnique.mockResolvedValue({
      id: "verification-1",
      userId: "user-1",
      email: "real@example.com",
      tokenHash: "token-hash",
      expiresAt: future,
      consumedAt: null,
      user: {
        displayName: "Nguyen Van A",
      },
    })

    const result = await verifyContactEmail("raw-token")

    expect(result.success).toBe(true)
    expect(prisma.userContactEmail.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        email: "real@example.com",
        verifiedAt: expect.any(Date),
      },
      update: {
        email: "real@example.com",
        verifiedAt: expect.any(Date),
      },
    })
    expect(prisma.userContactEmailVerification.update).toHaveBeenCalledWith({
      where: { id: "verification-1" },
      data: { consumedAt: expect.any(Date) },
    })
    expect(sendContactEmailVerifiedEmail).toHaveBeenCalledWith(
      "real@example.com",
      "Nguyen Van A",
    )
  })
})
