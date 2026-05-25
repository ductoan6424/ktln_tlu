import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".json"])
const IGNORED_DIRS = new Set([".git", ".next", "node_modules", "src/generated"])

const suspiciousFragments = [
  "\u00c3",
  "\u00c4",
  "\u00c6",
  "\u00e1\u00ba",
  "\u00e1\u00bb",
]

function isIgnored(relativePath: string) {
  return Array.from(IGNORED_DIRS).some((dir) =>
    relativePath === dir || relativePath.startsWith(`${dir}${path.sep}`),
  )
}

function listTextFiles(root: string, base = root): string[] {
  const files: string[] = []

  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry)
    const relativePath = path.relative(base, fullPath)

    if (isIgnored(relativePath)) {
      continue
    }

    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...listTextFiles(fullPath, base))
      continue
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry))) {
      files.push(fullPath)
    }
  }

  return files
}

describe("source text encoding", () => {
  it("does not contain common UTF-8 mojibake fragments", () => {
    const badFiles = listTextFiles(process.cwd())
      .map((filePath) => {
        const source = readFileSync(filePath, "utf8")
        const badFragment = suspiciousFragments.find((fragment) => source.includes(fragment))

        return badFragment ? path.relative(process.cwd(), filePath) : null
      })
      .filter(Boolean)

    expect(badFiles).toEqual([])
  })
})
