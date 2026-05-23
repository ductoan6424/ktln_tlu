import { beforeEach, describe, expect, it, vi } from "vitest"

const createClient = vi.hoisted(() => vi.fn())
const redirect = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`redirect:${path}`)
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))

vi.mock("next/navigation", () => ({ redirect }))

vi.mock("@/components/layout/auth-layout", () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => children,
}))

import AuthRouteLayout from "@/app/(auth)/layout"

describe("auth route layout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows authenticated users to reach auth-group gate pages", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
            },
          },
        }),
      },
    })

    await expect(AuthRouteLayout({ children: "content" })).resolves.toBeDefined()
    expect(redirect).not.toHaveBeenCalled()
  })
})
