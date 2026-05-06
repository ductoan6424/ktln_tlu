import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const createClient = vi.hoisted(() => vi.fn())
const createAdminClient = vi.hoisted(() => vi.fn())
const cookies = vi.hoisted(() => vi.fn())

vi.mock("@/lib/supabase/server", () => ({ createClient, createAdminClient }))
vi.mock("next/headers", () => ({ cookies }))
// Email sender không liên quan; mock để tránh load module thật.
vi.mock("@/lib/email/sender", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}))
vi.mock("@/lib/prisma/client", () => ({
  prisma: { userProfile: { findUnique: vi.fn() } },
}))

import { signOutOtherSessions } from "@/actions/auth"

const buildSupabase = (overrides: {
  user: { id: string } | null
  signOutError?: { message: string } | null
}) => {
  const signOut = vi.fn().mockResolvedValue({
    error: overrides.signOutError ?? null,
  })
  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: overrides.user },
          error: null,
        }),
        signOut,
      },
    } as unknown as SupabaseClient,
    signOut,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("signOutOtherSessions", () => {
  it("trả UNAUTHORIZED khi chưa login", async () => {
    const { client, signOut } = buildSupabase({ user: null })
    createClient.mockResolvedValue(client)

    const result = await signOutOtherSessions()

    expect(result.success).toBe(false)
    expect(result.code).toBe("UNAUTHORIZED")
    expect(signOut).not.toHaveBeenCalled()
  })

  it("gọi supabase.auth.signOut với scope='others' khi đã login", async () => {
    const { client, signOut } = buildSupabase({ user: { id: "user-a" } })
    createClient.mockResolvedValue(client)

    const result = await signOutOtherSessions()

    expect(result.success).toBe(true)
    expect(signOut).toHaveBeenCalledWith({ scope: "others" })
  })

  it("trả error khi Supabase trả error", async () => {
    const { client } = buildSupabase({
      user: { id: "user-a" },
      signOutError: { message: "rate limited" },
    })
    createClient.mockResolvedValue(client)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await signOutOtherSessions()

    expect(result.success).toBe(false)
    errorSpy.mockRestore()
  })
})
