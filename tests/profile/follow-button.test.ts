import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const refresh = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast, toasts: [] }),
}))

vi.mock("@/actions/follows", () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("FollowButton", () => {
  it("hiển thị nhãn 'Theo dõi' khi chưa follow", async () => {
    const { FollowButton } = await import("@/components/profile/follow-button")

    const html = renderToStaticMarkup(
      createElement(FollowButton, {
        targetUserId: "user-b",
        initialStatus: { isFollowing: false, isFollower: false, isMutual: false },
      })
    )

    expect(html).toContain("Theo dõi")
    expect(html).toContain('data-follow-state="not-following"')
  })

  it("hiển thị nhãn 'Đang theo dõi' khi đã follow nhưng chưa mutual", async () => {
    const { FollowButton } = await import("@/components/profile/follow-button")

    const html = renderToStaticMarkup(
      createElement(FollowButton, {
        targetUserId: "user-b",
        initialStatus: { isFollowing: true, isFollower: false, isMutual: false },
      })
    )

    expect(html).toContain("Đang theo dõi")
    expect(html).toContain('data-follow-state="following"')
  })

  it("hiển thị nhãn 'Bạn bè' khi đã mutual follow", async () => {
    const { FollowButton } = await import("@/components/profile/follow-button")

    const html = renderToStaticMarkup(
      createElement(FollowButton, {
        targetUserId: "user-b",
        initialStatus: { isFollowing: true, isFollower: true, isMutual: true },
      })
    )

    expect(html).toContain("Bạn bè")
    expect(html).toContain('data-follow-state="mutual"')
  })
})
