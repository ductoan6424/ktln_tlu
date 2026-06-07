import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const createClub = vi.hoisted(() => vi.fn())
const redirect = vi.hoisted(() =>
  vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`)
  }),
)

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/actions/clubs", () => ({ createClub }))
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

describe("new club route", () => {
  it("renders the club creation form for authenticated users", async () => {
    const page = await import("@/app/(main)/clubs/new/page")
    const markup = renderToStaticMarkup(await page.default())

    expect(markup).toContain("Tạo câu lạc bộ")
    expect(markup).toContain("name=\"name\"")
    expect(markup).toContain("name=\"category\"")
    expect(markup).toContain("name=\"visibility\"")
    expect(markup).toContain("name=\"requirePostApproval\"")
    expect(markup).toContain("name=\"chatEnabled\"")
    expect(markup).toContain("name=\"memberInviteEnabled\"")
  })

  it("redirects guests to login", async () => {
    getAuthorizationContext.mockResolvedValue(null)
    const page = await import("@/app/(main)/clubs/new/page")

    await expect(page.default()).rejects.toThrow("REDIRECT:/login")
    expect(redirect).toHaveBeenCalledWith("/login")
  })
})
