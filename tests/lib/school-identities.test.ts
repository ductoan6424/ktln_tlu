import { describe, expect, it } from "vitest"

import {
  buildInstitutionalEmail,
  formatSchoolIdentityCode,
  generateInitialPassword,
  getCodeConfigForRole,
} from "@/lib/school-identities/code"
import {
  parseSchoolIdentityImportRows,
  type SchoolIdentityImportInput,
} from "@/lib/school-identities/importer"
import {
  normalizeFacultyCode,
  parseCohortYear,
} from "@/lib/school-identities/profile-fields"

describe("school identity code generation", () => {
  it("formats role-specific codes with the agreed prefixes and padding", () => {
    expect(formatSchoolIdentityCode("STUDENT", 1)).toBe("SV0001")
    expect(formatSchoolIdentityCode("LECTURER", 1)).toBe("GV001")
    expect(formatSchoolIdentityCode("ADMIN", 1)).toBe("AD001")
  })

  it("builds lowercase institutional emails from generated codes", () => {
    expect(buildInstitutionalEmail("SV0001")).toBe("sv0001@thanglong.edu.vn")
    expect(buildInstitutionalEmail("gv001")).toBe("gv001@thanglong.edu.vn")
  })

  it("exposes deterministic sequence config per role", () => {
    expect(getCodeConfigForRole("STUDENT")).toEqual({ prefix: "SV", padding: 4 })
    expect(getCodeConfigForRole("LECTURER")).toEqual({ prefix: "GV", padding: 3 })
    expect(getCodeConfigForRole("ADMIN")).toEqual({ prefix: "AD", padding: 3 })
  })
})

describe("school identity import parser", () => {
  it("parses CSV/XLSX-like rows and defaults missing status to ACTIVE", () => {
    const rows = [
      ["role", "displayName", "department", "className", "cohort", "jobTitle"],
      ["student", " Nguyen Van A ", " CNTT ", "K36-CNTT1", "K36", ""],
      ["LECTURER", "Tran Thi B", "Toan", "", "", "ThS"],
    ]

    const result = parseSchoolIdentityImportRows(rows, "CREATE")

    expect(result.errors).toEqual([])
    expect(result.records).toEqual<SchoolIdentityImportInput[]>([
      {
        rowNumber: 2,
        code: null,
        role: "STUDENT",
        displayName: "Nguyen Van A",
        department: "CNTT",
        status: "ACTIVE",
        className: "K36-CNTT1",
        cohort: "K36",
        jobTitle: null,
      },
      {
        rowNumber: 3,
        code: null,
        role: "LECTURER",
        displayName: "Tran Thi B",
        department: "Toan",
        status: "ACTIVE",
        className: null,
        cohort: null,
        jobTitle: "ThS",
      },
    ])
  })

  it("requires only role, displayName, and department for create imports", () => {
    const result = parseSchoolIdentityImportRows(
      [
        ["role", "displayName"],
        ["STUDENT", "Nguyen Van A"],
      ],
      "CREATE",
    )

    expect(result.records).toEqual([])
    expect(result.errors).toContainEqual({
      rowNumber: 1,
      field: "department",
      message: "Thieu cot bat buoc: department",
    })
  })

  it("rejects invalid roles and statuses", () => {
    const result = parseSchoolIdentityImportRows(
      [
        ["role", "displayName", "department", "status"],
        ["GUEST", "Nguyen Van A", "CNTT", "ACTIVE"],
        ["STUDENT", "Tran Thi B", "CNTT", "LOCKED"],
      ],
      "CREATE",
    )

    expect(result.records).toEqual([])
    expect(result.errors).toEqual([
      {
        rowNumber: 2,
        field: "role",
        message: "Vai tro khong hop le",
      },
      {
        rowNumber: 3,
        field: "status",
        message: "Trang thai khong hop le",
      },
    ])
  })
})

describe("school identity profile fields", () => {
  it("normalizes department names into stable faculty codes", () => {
    expect(normalizeFacultyCode(" Công nghệ thông tin ")).toBe("CONGNGHETHONGTIN")
    expect(normalizeFacultyCode("CNTT")).toBe("CNTT")
  })

  it("extracts cohort year values for UserProfile.year", () => {
    expect(parseCohortYear("K38")).toBe(38)
    expect(parseCohortYear("Khóa 2026")).toBe(2026)
    expect(parseCohortYear(null)).toBeNull()
    expect(parseCohortYear("")).toBeNull()
  })
})

describe("initial password generation", () => {
  it("creates strong passwords without ambiguous characters", () => {
    for (let index = 0; index < 20; index += 1) {
      const password = generateInitialPassword()

      expect(password.length).toBeGreaterThanOrEqual(14)
      expect(password.length).toBeLessThanOrEqual(16)
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/[0-9]/)
      expect(password).toMatch(/[!@#$%^&*]/)
      expect(password).not.toMatch(/[O0Il]/)
    }
  })
})
