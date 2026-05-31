import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const createClient = vi.hoisted(() => vi.fn())

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}))

import { proxy } from "@/proxy"

function requestFor(pathname: string, cookie?: string) {
  return new NextRequest(new URL(pathname, "https://example.com"), {
    headers: cookie ? { cookie } : undefined,
  })
}

describe("proxy public assets", () => {
  it.each([
    "/sw.js",
    "/swe-worker-f61931bc2770d10b.js",
    "/manifest.webmanifest",
  ])("does not redirect %s through auth", async (pathname) => {
    const response = await proxy(requestFor(pathname))

    expect(createClient).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("x-middleware-next")).toBe("1")
  })

  it("redirects protected routes without calling Supabase when no auth cookie exists", async () => {
    const response = await proxy(requestFor("/feed"))

    expect(createClient).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBe("https://example.com/login?redirect=%2Ffeed")
  })

  it("lets protected routes continue when a Supabase auth cookie exists", async () => {
    const response = await proxy(
      requestFor("/feed", "sb-project-auth-token=token-value"),
    )

    expect(createClient).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("x-middleware-next")).toBe("1")
  })
})
