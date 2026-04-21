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
  it("always creates self-registered accounts as STUDENT even when role is supplied", async () => {
    const listUsers = vi.fn().mockResolvedValue({ data: { users: [] } })
    const createUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "student@example.edu",
        },
      },
      error: null,
    })

    createAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers,
          createUser,
        },
      },
    })

    const result = await register({
      email: "student@example.edu",
      password: "12345678",
      displayName: "Student User",
      studentId: "A46287",
      faculty: "CNTT",
      role: "ADMIN",
    })

    expect(result.success).toBe(true)
    expect(createUser).toHaveBeenCalledWith({
      email: "student@example.edu",
      password: "12345678",
      email_confirm: false,
      user_metadata: {
        display_name: "Student User",
        role: "STUDENT",
      },
    })
    expect(prisma.userProfile.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        email: "student@example.edu",
        displayName: "Student User",
        studentId: "A46287",
        major: "CNTT",
        role: "STUDENT",
      },
    })
  })
})
