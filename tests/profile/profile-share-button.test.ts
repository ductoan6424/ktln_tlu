import { describe, expect, it } from "vitest"

import { buildProfileShareUrl } from "@/components/profile/profile-share-button"

describe("buildProfileShareUrl", () => {
  it("builds an absolute public profile URL from the supplied origin", () => {
    expect(buildProfileShareUrl("user-1", "https://uniconnect.test/")).toBe(
      "https://uniconnect.test/profile/user-1"
    )
  })

  it("encodes profile ids as a path segment", () => {
    expect(buildProfileShareUrl("user 1", "https://uniconnect.test")).toBe(
      "https://uniconnect.test/profile/user%201"
    )
  })
})
