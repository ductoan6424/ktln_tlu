import { describe, expect, it } from "vitest"

import { buildSessionUser } from "@/app/(main)/session-user"

describe("buildSessionUser", () => {
  it("prefers avatarUrl from user profile when auth metadata has no avatar", () => {
    const result = buildSessionUser(
      {
        email: "vana@example.com",
        user_metadata: {
          display_name: "Nguyen Van A",
          department: "Cong nghe thong tin",
        },
      },
      {
        displayName: "Nguyen Van A",
        major: "Cong nghe thong tin",
        email: "vana@example.com",
        avatarUrl: "https://cdn.example/avatar.png",
      }
    )

    expect(result).toEqual({
      name: "Nguyen Van A",
      subtitle: "Cong nghe thong tin",
      avatarSrc: "https://cdn.example/avatar.png",
    })
  })

  it("falls back to auth metadata when profile data is missing", () => {
    const result = buildSessionUser(
      {
        email: "vana@example.com",
        user_metadata: {
          display_name: "Nguyen Van A",
          department: "Cong nghe thong tin",
          avatar_url: "https://cdn.example/metadata-avatar.png",
        },
      },
      null
    )

    expect(result).toEqual({
      name: "Nguyen Van A",
      subtitle: "Cong nghe thong tin",
      avatarSrc: "https://cdn.example/metadata-avatar.png",
    })
  })

  it("returns undefined when there is no authenticated user", () => {
    expect(buildSessionUser(null, null)).toBeUndefined()
  })
})
