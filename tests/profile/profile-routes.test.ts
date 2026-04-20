import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ProfilePageData } from "@/app/(main)/profile/profile-page-data"

const createClient = vi.hoisted(() => vi.fn())
const redirect = vi.hoisted(() =>
  vi.fn((destination: string) => {
    throw new Error(`REDIRECT:${destination}`)
  })
)
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND")
  })
)
const getProfilePageData = vi.hoisted(() => vi.fn())

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("next/navigation", () => ({ redirect, notFound }))
vi.mock("@/app/(main)/profile/profile-page-data", () => ({ getProfilePageData }))
vi.mock("@/components/profile/profile-page-content", () => ({
  ProfilePageContent: ({ data }: { data: ProfilePageData }) =>
    createElement("div", { "data-testid": "profile-page-content" }, data.profile.displayName),
}))
vi.mock("@/components/profile/profile-page-skeleton", () => ({
  ProfilePageSkeleton: () =>
    createElement("div", { "data-testid": "profile-page-skeleton" }, "profile-skeleton"),
}))

const ownProfileData: ProfilePageData = {
  viewerId: "user-self",
  profileUserId: "user-self",
  isOwnProfile: true,
  profile: {
    userId: "user-self",
    displayName: "Nguyen Van A",
    username: "vana",
    avatarUrl: null,
    bio: "Sinh vien nam cuoi",
    studentId: "A46287",
    role: "STUDENT",
    major: "Cong nghe thong tin",
    year: 4,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  stats: {
    postsCount: 2,
    clubsCount: 1,
    groupsCount: 1,
    connectionsCount: 5,
  },
  clubs: [],
  groups: [],
  connectionsPreview: {
    totalCount: 5,
    items: [],
  },
  posts: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("profile routes", () => {
  it("redirects /profile to login when there is no active session", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const ownProfilePageModule = await import("@/app/(main)/profile/page")

    await expect(ownProfilePageModule.default()).rejects.toThrow("REDIRECT:/login")
    expect(redirect).toHaveBeenCalledWith("/login")
  })

  it("renders /profile with shared profile content when the user is authenticated", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-self" } } }),
      },
    })
    getProfilePageData.mockResolvedValue(ownProfileData)

    const ownProfilePageModule = await import("@/app/(main)/profile/page")
    const element = await ownProfilePageModule.default()
    const markup = renderToStaticMarkup(element)

    expect(getProfilePageData).toHaveBeenCalledWith({
      viewerId: "user-self",
      profileUserId: "user-self",
    })
    expect(markup).toContain("data-testid=\"profile-page-content\"")
    expect(markup).toContain("Nguyen Van A")
  })

  it("renders /profile/[userId] with public-safe content and calls notFound for missing profiles", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "viewer-2" } } }),
      },
    })
    getProfilePageData.mockResolvedValueOnce({
      ...ownProfileData,
      viewerId: "viewer-2",
      profileUserId: "user-other",
      isOwnProfile: false,
      profile: {
        ...ownProfileData.profile,
        userId: "user-other",
        displayName: "Tran Thi B",
      },
    })

    const publicProfilePageModule = await import("@/app/(main)/profile/[userId]/page")
    const rendered = await publicProfilePageModule.default({
      params: Promise.resolve({ userId: "user-other" }),
    })
    const markup = renderToStaticMarkup(rendered)

    expect(getProfilePageData).toHaveBeenCalledWith({
      viewerId: "viewer-2",
      profileUserId: "user-other",
    })
    expect(markup).toContain("Tran Thi B")

    getProfilePageData.mockResolvedValueOnce(null)

    await expect(
      publicProfilePageModule.default({
        params: Promise.resolve({ userId: "missing-user" }),
      })
    ).rejects.toThrow("NOT_FOUND")
  })

  it("uses the shared loading skeleton for both profile routes", async () => {
    const ownLoading = await import("@/app/(main)/profile/loading")
    const publicLoading = await import("@/app/(main)/profile/[userId]/loading")

    const ownMarkup = renderToStaticMarkup(createElement(ownLoading.default))
    const publicMarkup = renderToStaticMarkup(createElement(publicLoading.default))

    expect(ownMarkup).toContain("data-testid=\"profile-page-skeleton\"")
    expect(publicMarkup).toContain("data-testid=\"profile-page-skeleton\"")
  })
})
