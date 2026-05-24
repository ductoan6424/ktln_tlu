import { describe, expect, it } from "vitest"

import { announcementEmailTemplate } from "@/lib/email/templates"

describe("announcementEmailTemplate", () => {
  it("escapes announcement HTML content before rendering the email", () => {
    const template = announcementEmailTemplate(
      "Nguyễn <A>",
      "Lịch <thi>",
      "Nội dung <script>alert(1)</script>",
      "https://example.com/feed?announcement=ann-1",
    )

    expect(template.html).toContain("Nguyễn &lt;A&gt;")
    expect(template.html).toContain("Lịch &lt;thi&gt;")
    expect(template.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
    expect(template.html).not.toContain("<script>alert(1)</script>")
  })
})
