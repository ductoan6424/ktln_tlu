import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const createClient = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: {
    findUnique: vi.fn(),
  },
  userSettings: {
    upsert: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  changePassword,
  updateAppearanceSettings,
  updateNotificationSettings,
} from "@/actions/account-settings"

function mockNoSession() {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  } as unknown as SupabaseClient)
}

function mockWithSession(userId = "user-1", email = "sv001@thanglong.edu.vn") {
  const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null })
  const updateUser = vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null })
  const signOut = vi.fn().mockResolvedValue({ error: null })

  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId, email } }, error: null }),
      signInWithPassword,
      updateUser,
      signOut,
    },
  } as unknown as SupabaseClient)

  prisma.userProfile.findUnique.mockResolvedValue({
    userId,
    email,
  })

  return { signInWithPassword, updateUser, signOut }
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.userSettings.upsert.mockResolvedValue({})
})

describe("updateAppearanceSettings", () => {
  it("requires an authenticated user", async () => {
    mockNoSession()

    const result = await updateAppearanceSettings({
      theme: "SYSTEM",
      compactMode: false,
      reducedMotion: false,
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("UNAUTHORIZED")
    expect(prisma.userSettings.upsert).not.toHaveBeenCalled()
  })

  it("upserts the authenticated user's appearance settings", async () => {
    mockWithSession("user-1")

    const result = await updateAppearanceSettings({
      theme: "DARK",
      compactMode: true,
      reducedMotion: true,
    })

    expect(result.success).toBe(true)
    expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        theme: "DARK",
        compactMode: true,
        reducedMotion: true,
      },
      update: {
        theme: "DARK",
        compactMode: true,
        reducedMotion: true,
      },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/settings")
  })
})

describe("updateNotificationSettings", () => {
  it("upserts the four notification groups", async () => {
    mockWithSession("user-1")

    const result = await updateNotificationSettings({
      notifyMessages: false,
      notifyPostInteractions: true,
      notifyEvents: false,
      notifySystem: true,
    })

    expect(result.success).toBe(true)
    expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        notifyMessages: false,
        notifyPostInteractions: true,
        notifyEvents: false,
        notifySystem: true,
      },
      update: {
        notifyMessages: false,
        notifyPostInteractions: true,
        notifyEvents: false,
        notifySystem: true,
      },
    })
  })
})

describe("changePassword", () => {
  it("rejects weak passwords", async () => {
    mockWithSession()

    const result = await changePassword({
      currentPassword: "Oldpass1",
      newPassword: "password",
      confirmPassword: "password",
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("rejects mismatched confirmation", async () => {
    mockWithSession()

    const result = await changePassword({
      currentPassword: "Oldpass1",
      newPassword: "Newpass1",
      confirmPassword: "Otherpass1",
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("verifies the current password before updating", async () => {
    const { signInWithPassword, updateUser } = mockWithSession()
    signInWithPassword.mockResolvedValue({ data: null, error: { message: "invalid" } })

    const result = await changePassword({
      currentPassword: "Wrongpass1",
      newPassword: "Newpass1",
      confirmPassword: "Newpass1",
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("INVALID_PASSWORD")
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("updates password and signs out other sessions after success", async () => {
    const { signInWithPassword, updateUser, signOut } = mockWithSession("user-1", "sv001@thanglong.edu.vn")

    const result = await changePassword({
      currentPassword: "Oldpass1",
      newPassword: "Newpass1",
      confirmPassword: "Newpass1",
    })

    expect(result.success).toBe(true)
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "sv001@thanglong.edu.vn",
      password: "Oldpass1",
    })
    expect(updateUser).toHaveBeenCalledWith({ password: "Newpass1" })
    expect(signOut).toHaveBeenCalledWith({ scope: "others" })
  })
})
