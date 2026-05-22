import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function readPrismaSchema() {
  return readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8")
}

function readAccountModerationMigration() {
  return readFileSync(
    join(
      process.cwd(),
      "prisma",
      "migrations",
      "202605212350_admin_moderation_users",
      "migration.sql",
    ),
    "utf8",
  )
}

describe("admin account moderation schema", () => {
  it("defines account moderation status and history model", () => {
    const schema = readPrismaSchema()
    const migration = readAccountModerationMigration()

    expect(schema).toContain("enum UserAccountModerationStatus")
    expect(schema).toContain("model UserAccountModeration")
    expect(schema).toContain("accountModerations")
    expect(schema).toContain("createdBy   String?")
    expect(schema).toContain("AccountModerationCreator")
    expect(schema).toContain("onDelete: SetNull")
    expect(schema).toContain("@@index([createdBy])")
    expect(schema).toContain("@@map(\"user_account_moderations\")")

    expect(migration).toMatch(/^\s*"created_by" TEXT,\s*$/m)
    expect(migration).toContain(
      'CREATE INDEX "user_account_moderations_created_by_idx"',
    )
    expect(migration).toMatch(
      /ADD CONSTRAINT "user_account_moderations_created_by_fkey"\s+FOREIGN KEY \("created_by"\) REFERENCES "user_profiles"\("user_id"\)\s+ON DELETE SET NULL ON UPDATE CASCADE;/,
    )
  })
})
