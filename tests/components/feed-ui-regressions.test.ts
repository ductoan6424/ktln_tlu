import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8")

describe("Feed UI regression contracts", () => {
  it("keeps the desktop feed sidebars fixed while the center feed owns the document flow", () => {
    const feedPage = source("src/app/(main)/feed/feed-page-client.tsx")

    expect(feedPage).toContain("fixed top-16 bottom-0 left-0")
    expect(feedPage).toContain("fixed top-16 right-0 bottom-0")
    expect(feedPage).toContain("[&::-webkit-scrollbar]:hidden xl:block")
    expect(feedPage).toContain('className="mx-auto w-full max-w-[660px]"')
  })

  it("uses a dedicated desktop post close button and reserves room beside the post menu", () => {
    const postDetailDialog = source("src/components/feed/post-detail-dialog.tsx")

    expect(postDetailDialog).toContain("showCloseButton={false}")
    expect(postDetailDialog).toContain("<DialogClose")
    expect(postDetailDialog).toContain("hidden rounded-full md:inline-flex")
    expect(postDetailDialog).toContain("md:pr-14")
  })

  it("derives mobile notification and message badges from mock unread data", () => {
    const mobileBottomNav = source("src/components/layout/mobile-bottom-nav.tsx")
    const mainLayout = source("src/app/(main)/layout.tsx")

    expect(mobileBottomNav).toContain("MOCK_UNREAD_NOTIFICATION_COUNT")
    expect(mobileBottomNav).toContain("MOCK_UNREAD_MESSAGE_COUNT")
    expect(mainLayout).not.toContain("notificationCount={3}")
    expect(mainLayout).not.toContain("messageCount={5}")
  })

  it("aligns the responsive header as three viewport-wide zones", () => {
    const topNavbar = source("src/components/layout/top-navbar.tsx")

    expect(topNavbar).toContain("lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]")
    expect(topNavbar).toContain("lg:justify-self-center")
    expect(topNavbar).toContain("lg:justify-self-end")
    expect(topNavbar).toContain("hidden w-64 xl:block")
    expect(topNavbar).toContain("xl:hidden")
    expect(topNavbar).not.toContain("max-w-7xl")
    expect(topNavbar).not.toContain("absolute left-1/2 -translate-x-1/2")
  })
})
