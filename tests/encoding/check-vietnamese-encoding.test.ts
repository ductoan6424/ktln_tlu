import { Buffer } from "node:buffer"
import { pathToFileURL } from "node:url"
import path from "node:path"
import { describe, expect, it } from "vitest"

const scriptUrl = pathToFileURL(
  path.join(process.cwd(), "scripts", "check-vietnamese-encoding.mjs"),
).href

describe("check-vietnamese-encoding script", () => {
  it("reports encoding issues and Vietnamese text quality signals", async () => {
    const { analyzeTextFile } = await import(scriptUrl)
    const buffer = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(
        `const message = 'Xin chao lop hoc tieng Viet: Đăng nhập ${String.fromCharCode(0xfffd)}';\u0007`,
        "utf8",
      ),
      Buffer.from([0xe9]),
    ])

    const result = analyzeTextFile("src/example.ts", buffer)

    expect(result.issues.map((issue: { code: string }) => issue.code)).toEqual(
      expect.arrayContaining([
        "utf8-bom",
        "invalid-utf8",
        "replacement-character",
        "control-character",
      ]),
    )
    expect(result.vietnamese.withDiacritics).toBeGreaterThan(0)
    expect(result.vietnamese.asciiCandidates).toBeGreaterThan(0)
  })
})
