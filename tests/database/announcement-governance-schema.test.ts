import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const GOVERNANCE_MIGRATION_PATH = join(
  process.cwd(),
  "prisma",
  "migrations",
  "202605251200_announcement_governance_workflow",
  "migration.sql",
)

function readPrismaSchema() {
  return readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8")
}

function readGovernanceMigration() {
  return existsSync(GOVERNANCE_MIGRATION_PATH)
    ? readFileSync(GOVERNANCE_MIGRATION_PATH, "utf8")
    : ""
}

function readAdminRbacMigration() {
  return readFileSync(
    join(
      process.cwd(),
      "prisma",
      "migrations",
      "202604220130_add_courses_and_admin_rbac",
      "migration.sql",
    ),
    "utf8",
  )
}

function block(source: string, kind: "enum" | "model", name: string) {
  const definition = source.match(
    new RegExp(`${kind} ${name}\\s*\\{([\\s\\S]*?)\\n\\}`),
  )

  expect(definition, `${kind} ${name} must be defined`).not.toBeNull()

  return definition?.[1] ?? ""
}

function expectValues(definition: string, values: string[]) {
  for (const value of values) {
    expect(definition).toMatch(new RegExp(`\\b${value}\\b`))
  }
}

describe("announcement governance schema", () => {
  it("defines the workflow statuses and supporting governance enums", () => {
    const schema = readPrismaSchema()

    expectValues(block(schema, "enum", "AnnouncementStatus"), [
      "DRAFT",
      "PENDING_UNIT_REVIEW",
      "PENDING_ADMIN_REVIEW",
      "CHANGES_REQUESTED",
      "REJECTED",
      "APPROVED",
      "SCHEDULED",
      "PUBLISHED",
      "EXPIRED",
      "WITHDRAWN",
      "SUPERSEDED",
      "ARCHIVED",
    ])

    const enums: Array<[string, string[]]> = [
      ["OrganizationUnitType", ["DEPARTMENT", "FACULTY", "ORGANIZATION"]],
      ["AnnouncementUnitMemberRole", ["AUTHOR", "APPROVER"]],
      [
        "AnnouncementCategory",
        [
          "ACADEMIC",
          "TUITION",
          "EXAMINATION",
          "STUDENT_AFFAIRS",
          "EVENT",
          "SYSTEM",
          "EMERGENCY",
          "OTHER",
        ],
      ],
      ["AnnouncementPriority", ["NORMAL", "IMPORTANT", "URGENT"]],
      ["AnnouncementApprovalStage", ["UNIT", "ADMIN"]],
      [
        "AnnouncementApprovalDecision",
        ["APPROVED", "CHANGES_REQUESTED", "REJECTED"],
      ],
      ["AnnouncementAttachmentSource", ["UPLOAD", "LINK"]],
    ]

    for (const [name, values] of enums) {
      expectValues(block(schema, "enum", name), values)
    }
  })

  it("defines units, immutable revisions, delivery records, and announcement links", () => {
    const schema = readPrismaSchema()
    const organizationUnit = block(schema, "model", "OrganizationUnit")
    const unitMember = block(schema, "model", "AnnouncementUnitMember")
    const revision = block(schema, "model", "AnnouncementRevision")
    const revisionTarget = block(schema, "model", "AnnouncementRevisionTarget")
    const approval = block(schema, "model", "AnnouncementApproval")
    const attachment = block(schema, "model", "AnnouncementAttachment")
    const recipient = block(schema, "model", "AnnouncementRecipient")
    const auditEvent = block(schema, "model", "AnnouncementAuditEvent")
    const announcement = block(schema, "model", "Announcement")

    expect(organizationUnit).toContain("code")
    expect(organizationUnit).toContain("@unique")
    expectValues(organizationUnit, [
      "id",
      "name",
      "type",
      "facultyId",
      "clubId",
      "groupId",
      "isActive",
      "createdAt",
      "updatedAt",
      "members",
      "announcements",
      "revisions",
    ])
    expectValues(unitMember, ["unitId", "userId", "role", "isActive", "createdAt"])
    expect(unitMember).toContain("@@id([unitId, userId, role])")

    expectValues(revision, [
      "announcementId",
      "version",
      "authorId",
      "issuingUnitId",
      "title",
      "content",
      "audience",
      "category",
      "priority",
      "pinToTop",
      "requestEmailDelivery",
      "requiresAcknowledgement",
      "scheduledAt",
      "actionDeadlineAt",
      "expiresAt",
      "submittedAt",
      "targets",
      "attachments",
      "approvals",
      "recipients",
      "auditEvents",
      "activeFor",
      "publishedFor",
    ])
    expect(revision).toContain("@@unique([announcementId, version])")
    expectValues(revisionTarget, ["revisionId", "type", "value"])
    expect(revisionTarget).toContain("@@id([revisionId, type, value])")
    expectValues(approval, [
      "announcementId",
      "revisionId",
      "stage",
      "decision",
      "reviewerId",
      "comment",
      "createdAt",
    ])
    expect(approval).toContain("@@unique([revisionId, stage])")
    expectValues(attachment, [
      "announcementId",
      "revisionId",
      "source",
      "url",
      "name",
      "type",
      "mimeType",
      "sizeBytes",
      "createdAt",
    ])
    expectValues(recipient, [
      "announcementId",
      "revisionId",
      "userId",
      "publishedAt",
      "seenAt",
      "acknowledgedAt",
      "notificationDispatchedAt",
      "emailSentAt",
      "deliveryError",
      "createdAt",
    ])
    expect(recipient).toContain("@@id([announcementId, userId])")
    expectValues(auditEvent, [
      "announcementId",
      "revisionId",
      "actorId",
      "action",
      "metadata",
      "createdAt",
    ])

    expectValues(announcement, [
      "issuingUnitId",
      "category",
      "priority",
      "requestEmailDelivery",
      "requiresAcknowledgement",
      "scheduledAt",
      "actionDeadlineAt",
      "activeRevisionId",
      "publishedRevisionId",
      "supersedesId",
      "withdrawalReason",
      "revisions",
      "attachments",
      "approvals",
      "recipients",
      "auditEvents",
      "activeRevision",
      "publishedRevision",
      "replacementSource",
      "replacements",
    ])
    expect(announcement).toMatch(/category\s+AnnouncementCategory\s+@default\(OTHER\)/)
    expect(announcement).toMatch(/priority\s+AnnouncementPriority\s+@default\(NORMAL\)/)
    expect(announcement).toMatch(/requestEmailDelivery\s+Boolean\s+@default\(false\)/)
    expect(announcement).toMatch(/requiresAcknowledgement\s+Boolean\s+@default\(false\)/)
    expect(announcement).toMatch(/activeRevisionId\s+String\?\s+@unique/)
    expect(announcement).toMatch(/publishedRevisionId\s+String\?\s+@unique/)

    expect(block(schema, "model", "UserProfile")).toMatch(
      /announcementUnitMemberships|unitMemberships/,
    )
    expect(block(schema, "model", "UserProfile")).toContain(
      "authoredAnnouncementRevisions",
    )
    expect(block(schema, "model", "UserProfile")).toContain(
      "reviewedAnnouncementApprovals",
    )
    expect(block(schema, "model", "UserProfile")).toContain(
      "announcementRecipients",
    )
    expect(block(schema, "model", "UserProfile")).toContain(
      "announcementAuditEvents",
    )

    for (const model of ["Faculty", "Club", "Group"]) {
      expect(block(schema, "model", model)).toContain("organizationUnits")
    }
  })

  it("migrates the persistence layer and seeds units and delegated permissions", () => {
    const migration = readGovernanceMigration()
    const existingRbacMigration = readAdminRbacMigration()

    for (const status of [
      "PENDING_UNIT_REVIEW",
      "PENDING_ADMIN_REVIEW",
      "CHANGES_REQUESTED",
      "REJECTED",
      "APPROVED",
      "SCHEDULED",
      "EXPIRED",
      "WITHDRAWN",
      "SUPERSEDED",
    ]) {
      expect(migration).toContain(`ADD VALUE IF NOT EXISTS '${status}'`)
    }

    for (const table of [
      "organization_units",
      "announcement_unit_members",
      "announcement_revisions",
      "announcement_revision_targets",
      "announcement_approvals",
      "announcement_attachments",
      "announcement_recipients",
      "announcement_audit_events",
    ]) {
      expect(migration).toContain(`CREATE TABLE "${table}"`)
    }

    expect(migration).toContain("Phong Dao tao")
    expect(migration).toContain("Phong Cong tac Chinh tri Sinh vien")
    expect(migration).toContain("Phong Cong nghe Thong tin")
    expect(migration).toContain("FROM \"faculties\"")
    expect(migration).toContain("admin.announcements.compose")
    expect(migration).toContain("admin.announcements.approve.unit")
    expect(migration).toContain("admin.announcements.approve.admin")
    expect(migration).toContain("admin.announcements.configure")
    expect(migration).toMatch(
      /WHERE r\."code" = 'ANNOUNCEMENT_MANAGER'\s+AND p\."code" IN \('admin\.announcements\.compose', 'admin\.announcements\.approve\.unit'\)/,
    )
    expect(existingRbacMigration).toContain("admin.announcements.manage")
  })
})
