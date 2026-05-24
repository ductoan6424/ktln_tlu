import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const redirect = vi.hoisted(() => vi.fn())
const refresh = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => vi.fn())
const getUserSettings = vi.hoisted(() => vi.fn())
const defaultUserSettings = vi.hoisted(() => ({
  theme: "SYSTEM",
  compactMode: false,
  reducedMotion: false,
  notifyMessages: true,
  notifyPostInteractions: true,
  notifyEvents: true,
  notifySystem: true,
}))

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
    children: ReactNode
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
    userContactEmail: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/lib/settings/user-settings", () => ({
  DEFAULT_USER_SETTINGS: defaultUserSettings,
  getUserSettings,
}))

vi.mock("@/actions/profile", () => ({
  updateUserAvatar: vi.fn(),
  updateUserProfile: vi.fn(),
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

function mockResolved(fn: unknown, value: unknown) {
  ;(fn as { mockResolvedValue: (nextValue: unknown) => void }).mockResolvedValue(value)
}

describe("settings profile section", () => {
  it("renders AvatarUploader instead of the legacy static camera block", async () => {
    const { ProfileSection } = await import("@/app/(main)/settings/profile-section")

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

describe("settings page navigation", () => {
  it("does not render the removed language settings section", async () => {
    const { createClient } = await import("@/lib/supabase/server")
    const { prisma } = await import("@/lib/prisma/client")
    mockResolved(createClient, {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-self" } }, error: null }),
      },
    })
    mockResolved(prisma.userProfile.findUnique, {
      displayName: "Nguyen Van A",
      studentId: "A46287",
      avatarUrl: null,
      bio: null,
      major: "Cong nghe thong tin",
      year: 4,
      email: "vana@example.com",
    })
    mockResolved(prisma.userContactEmail.findUnique, null)
    getUserSettings.mockResolvedValue(defaultUserSettings)

    const SettingsPage = (await import("@/app/(main)/settings/page")).default
    const element = await SettingsPage({
      searchParams: Promise.resolve({ section: "profile" }),
    })
    const markup = renderToStaticMarkup(element)

    expect(markup).not.toContain("Ngôn ngữ")
    expect(markup).not.toContain("English")
    expect(markup).toContain("Hồ sơ cá nhân")
  })

  it("redirects unknown settings sections back to profile", async () => {
    const { createClient } = await import("@/lib/supabase/server")
    mockResolved(createClient, {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-self" } }, error: null }),
      },
    })

    const SettingsPage = (await import("@/app/(main)/settings/page")).default
    await SettingsPage({
      searchParams: Promise.resolve({ section: "unknown" }),
    })

    expect(redirect).toHaveBeenCalledWith("/settings?section=profile")
  })
})
