import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

type PackageJson = {
  scripts?: Record<string, string>
}

describe("package scripts cho Prisma", () => {
  it("generate Prisma client trước khi chạy dev", () => {
    const packageJsonPath = path.resolve(process.cwd(), "package.json")
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson

    expect(packageJson.scripts?.predev).toBe("npm run prisma:generate")
    expect(packageJson.scripts?.["prisma:generate"]).toBe("prisma generate")
  })
})
