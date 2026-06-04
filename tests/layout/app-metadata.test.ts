import { describe, expect, it } from "vitest"

describe("app metadata", () => {
  it("uses TLU Community as the default title and suffixes page titles", async () => {
    const layout = await import("@/app/layout")

    expect(layout.metadata.title).toEqual({
      default: "TLU Community",
      template: "%s | TLU Community",
    })
  })

  it("exposes the site logo and generated icons for browser tabs", async () => {
    const layout = await import("@/app/layout")

    expect(layout.metadata.icons).toMatchObject({
      icon: expect.arrayContaining([
        { url: "/logo.svg", type: "image/svg+xml" },
        { url: "/favicon.ico" },
        { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      ]),
      shortcut: ["/favicon.ico"],
    })
  })
})
