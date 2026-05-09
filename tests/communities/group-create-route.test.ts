import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const createGroup = vi.hoisted(() => vi.fn())
const redirect = vi.hoisted(() =>
  vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`)
  }),
)

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/actions/groups", () => ({ createGroup }))
vi.mock("next/navigation", () => ({ redirect }))

beforeEach(() => {
  vi.clearAllMocks()
  getAuthorizationContext.mockResolvedValue({
    baseRole: "STUDENT",
    profile: {
      userId: "viewer-1",
      displayName: "Viewer",
      avatarUrl: null,
    },
  })
})

describe("new group route", () => {
  it("renders the group creation form for authenticated users", async () => {
    const page = await import("@/app/(main)/groups/new/page")
    const markup = renderToStaticMarkup(await page.default())

    expect(markup).toContain("Tạo nhóm")
    expect(markup).toContain("name=\"name\"")
    expect(markup).toContain("name=\"visibility\"")
    expect(markup).toContain("name=\"requirePostApproval\"")
    expect(markup).toContain("name=\"chatEnabled\"")
    expect(markup).toContain("name=\"memberInviteEnabled\"")
  })

  it("redirects guests to login", async () => {
    getAuthorizationContext.mockResolvedValue(null)
    const page = await import("@/app/(main)/groups/new/page")

    await expect(page.default()).rejects.toThrow("REDIRECT:/login")
    expect(redirect).toHaveBeenCalledWith("/login")
  })
})
