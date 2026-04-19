import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AdminListPageShell } from "@/components/admin/shells/admin-list-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

describe("admin shells", () => {
  it("renders the users list shell from the admin module definition", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminListPageShell, { module: getAdminModule("users") }),
    )

    expect(markup).toContain("Quan ly user")
    expect(markup).toContain("Tong user")
    expect(markup).toContain("Them user")
    expect(markup).toContain("Nguyen Duc Toan")
  })
})
