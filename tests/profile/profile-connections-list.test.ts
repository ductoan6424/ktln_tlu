import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/actions/follows", () => ({
  unfollowUser: vi.fn(),
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
    toasts: [],
  }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

import {
  ProfileConnectionsList,
  filterProfileConnections,
} from "@/components/profile/profile-connections-list"

const connections = [
  {
    userId: "user-1",
    displayName: "Phan Văn Quyền",
    username: "quyenpv",
    avatarUrl: null,
    studentId: "A12345",
  },
  {
    userId: "user-2",
    displayName: "Nguyen Thi B",
    username: "nguyenthib",
    avatarUrl: null,
    studentId: "B67890",
  },
]

describe("filterProfileConnections", () => {
  it("filters connections by display name, username, or student id", () => {
    expect(filterProfileConnections(connections, "quyen")).toEqual([connections[0]])
    expect(filterProfileConnections(connections, "B67890")).toEqual([connections[1]])
    expect(filterProfileConnections(connections, "nguyenthib")).toEqual([connections[1]])
  })

  it("returns all connections for blank queries", () => {
    expect(filterProfileConnections(connections, "   ")).toEqual(connections)
  })

  it("renders an action trigger on each connection card", () => {
    const markup = renderToStaticMarkup(
      createElement(ProfileConnectionsList, {
        profileName: "Phan Văn Quyền",
        totalCount: connections.length,
        connections,
      })
    )

    expect(markup).toContain("aria-label=\"Mở tuỳ chọn liên hệ\"")
  })
})
