import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const redirect = vi.hoisted(() => vi.fn())
const refresh = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  redirect,
  useRouter: () => ({
    refresh,
  }),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: unknown
    href: string
  }) => createElement("a", { href }, children),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    userProfile: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/actions/profile", () => ({
  updateUserAvatar: vi.fn(),
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast,
    toasts: [],
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("settings profile section", () => {
  it("renders AvatarUploader instead of the legacy static camera block", async () => {
    const { ProfileSection } = await import("@/app/(main)/settings/page")

    const markup = renderToStaticMarkup(
      createElement(ProfileSection, {
        profile: {
          displayName: "Nguyen Van A",
          studentId: "A46287",
          avatarUrl: "https://cdn.example/avatar-self.png",
          bio: "Sinh vien nam cuoi",
          major: "Cong nghe thong tin",
          year: 4,
          email: "vana@example.com",
        },
      })
    )

    expect(markup).toContain("Nguyen Van A")
    expect(markup).toContain("type=\"file\"")
    expect(markup).toContain("5MB")
    expect(markup).not.toContain("2MB")
  })
})
