import { beforeEach, describe, expect, it, vi } from "vitest"

const createClient = vi.hoisted(() => vi.fn())
const createAdminClient = vi.hoisted(() => vi.fn())
const sendVerificationEmail = vi.hoisted(() => vi.fn())
const sendPasswordResetEmail = vi.hoisted(() => vi.fn())
const sendContactEmailVerifiedEmail = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  schoolIdentity: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  schoolIdentityCodeSequence: {
    upsert: vi.fn(),
  },
  userContactEmail: {
    findUnique: vi.fn(),
  },
  passwordReset: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma)),
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
  sendContactEmailVerifiedEmail,
}))

import { forgotPassword, login } from "@/actions/auth"

beforeEach(() => {
  vi.resetAllMocks()
  createAdminClient.mockReturnValue({
    auth: {
      admin: {
        updateUserById: vi.fn(),
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
        createUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "admin-user",
            },
          },
          error: null,
        }),
      },
    },
  })
  prisma.userProfile.create.mockResolvedValue({ userId: "admin-user" })
  prisma.schoolIdentity.create.mockResolvedValue({ userId: "admin-user" })
  prisma.schoolIdentityCodeSequence.upsert.mockResolvedValue({ prefix: "AD" })
  prisma.passwordReset.deleteMany.mockResolvedValue({ count: 0 })
  prisma.passwordReset.create.mockResolvedValue({ id: "reset-1" })
  sendPasswordResetEmail.mockResolvedValue(undefined)
})

describe("school account login", () => {
  it("auto-bootstraps the hard-coded admin account before first login", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null })
    createClient.mockResolvedValue({
      auth: {
        signInWithPassword,
        signOut: vi.fn(),
      },
    })
    prisma.schoolIdentity.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        status: "ACTIVE",
        userId: "admin-user",
      })
    const supabaseAdmin = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: "admin-user" } },
            error: null,
          }),
        },
      },
    }
    createAdminClient.mockReturnValue(supabaseAdmin)

    const result = await login("ad001@thanglong.edu.vn", "Admin@123456")

    expect(result.success).toBe(true)
    expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
      email: "ad001@thanglong.edu.vn",
      password: "Admin@123456",
      email_confirm: true,
      user_metadata: {
        display_name: "Quan tri he thong",
        role: "ADMIN",
      },
    })
    expect(prisma.userProfile.create).toHaveBeenCalledWith({
      data: {
        userId: "admin-user",
        email: "ad001@thanglong.edu.vn",
        displayName: "Quan tri he thong",
        role: "ADMIN",
        major: "He thong",
      },
    })
    expect(prisma.schoolIdentity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "AD001",
        institutionalEmail: "ad001@thanglong.edu.vn",
        role: "ADMIN",
        displayName: "Quan tri he thong",
        department: "He thong",
        status: "ACTIVE",
        userId: "admin-user",
      }),
    })
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "ad001@thanglong.edu.vn",
      password: "Admin@123456",
    })
  })

  it("rejects inactive school identities after Supabase credentials are valid", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null })
    createClient.mockResolvedValue({
      auth: {
        signInWithPassword,
        signOut: vi.fn(),
      },
    })
    prisma.schoolIdentity.findUnique.mockResolvedValue({
      status: "INACTIVE",
      userId: "user-1",
    })

    const result = await login("sv0001@thanglong.edu.vn", "password")

    expect(result.success).toBe(false)
    expect(result.code).toBe("ACCOUNT_INACTIVE")
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "sv0001@thanglong.edu.vn",
      password: "password",
    })
  })
})

describe("forgotPassword with verified contact email", () => {
  it("finds the school account by institutional email and sends reset mail to verified real email", async () => {
    prisma.schoolIdentity.findUnique.mockResolvedValue({
      userId: "user-1",
      institutionalEmail: "sv0001@thanglong.edu.vn",
      status: "ACTIVE",
      user: {
        userId: "user-1",
        displayName: "Nguyen Van A",
      },
    })
    prisma.userContactEmail.findUnique.mockResolvedValue({
      userId: "user-1",
      email: "real@example.com",
      verifiedAt: new Date("2026-05-22T00:00:00.000Z"),
    })

    const result = await forgotPassword("sv0001@thanglong.edu.vn")

    expect(result.success).toBe(true)
    expect(prisma.passwordReset.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(prisma.passwordReset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        token: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    })
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      "real@example.com",
      "Nguyen Van A",
      expect.any(String),
    )
  })

  it("does not send reset mail when the contact email has not been verified", async () => {
    prisma.schoolIdentity.findUnique.mockResolvedValue({
      userId: "user-1",
      status: "ACTIVE",
      user: {
        userId: "user-1",
        displayName: "Nguyen Van A",
      },
    })
    prisma.userContactEmail.findUnique.mockResolvedValue(null)

    const result = await forgotPassword("sv0001@thanglong.edu.vn")

    expect(result.success).toBe(false)
    expect(result.code).toBe("CONTACT_EMAIL_REQUIRED")
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })
})
