import { beforeEach, describe, expect, it, vi } from "vitest"

const createAdminClient = vi.hoisted(() => vi.fn())
const createClient = vi.hoisted(() => vi.fn())
const sendVerificationEmail = vi.hoisted(() => vi.fn())
const sendPasswordResetEmail = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  emailVerification: {
    create: vi.fn(),
  },
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient,
  createClient,
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

vi.mock("@/lib/email/sender", () => ({
  sendVerificationEmail,
  sendPasswordResetEmail,
}))

import { register } from "@/actions/auth"

beforeEach(() => {
  vi.clearAllMocks()
  createClient.mockResolvedValue({
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
  })
  prisma.userProfile.findUnique.mockResolvedValue(null)
  prisma.userProfile.create.mockResolvedValue({ userId: "user-1" })
  prisma.userProfile.deleteMany.mockResolvedValue({ count: 0 })
  prisma.emailVerification.create.mockResolvedValue({ id: "verification-1" })
  sendVerificationEmail.mockResolvedValue(undefined)
  sendPasswordResetEmail.mockResolvedValue(undefined)
})

describe("register", () => {
  it("rejects self-registration because accounts must be provisioned by school identity import", async () => {
    const result = await register({
      email: "student@example.edu",
      password: "12345678",
      displayName: "Student User",
      studentId: "A46287",
      faculty: "CNTT",
      role: "ADMIN",
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("REGISTER_DISABLED")
    expect(createAdminClient).not.toHaveBeenCalled()
    expect(prisma.userProfile.create).not.toHaveBeenCalled()
  })
})
