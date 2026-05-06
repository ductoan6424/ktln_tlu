import { readFileSync } from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const source = () =>
  readFileSync(
    path.join(process.cwd(), "src/components/feed/post-detail-dialog.tsx"),
    "utf8"
  )

describe("PostDetailDialog", () => {
  it("uses the destructive red color for liked heart icons", () => {
    const postDetailSource = source()

    expect(postDetailSource).toContain("fill-destructive text-destructive")
    expect(postDetailSource).not.toContain("fill-primary text-primary")
  })
})
