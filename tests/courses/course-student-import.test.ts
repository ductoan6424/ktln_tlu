import { describe, expect, it } from "vitest"

import {
  findStudentCodeColumnIndex,
  normalizeImportHeader,
  parseCsvRows,
  parseStudentCodesFromRows,
} from "@/lib/courses/student-import"

describe("course student import parser", () => {
  it("normalizes Vietnamese student-code headers case-insensitively and accent-insensitively", () => {
    expect(normalizeImportHeader("Mã sinh viên")).toBe("ma sinh vien")
    expect(normalizeImportHeader("MA SINH VIEN")).toBe("ma sinh vien")
    expect(normalizeImportHeader("ma sinh vien")).toBe("ma sinh vien")
    expect(normalizeImportHeader("student_id")).toBe("studentid")
  })

  it("finds the student-code column from supported headers", () => {
    expect(findStudentCodeColumnIndex(["Họ tên", "Mã sinh viên", "Email"])).toBe(1)
    expect(findStudentCodeColumnIndex(["name", "MA SINH VIEN"])).toBe(1)
    expect(findStudentCodeColumnIndex(["student_id", "name"])).toBe(0)
  })

  it("parses unique uppercase student codes from the matched header column", () => {
    const result = parseStudentCodesFromRows([
      ["Họ tên", "Mã sinh viên", "Email"],
      ["Nguyễn Văn A", " sv001 ", "a@example.com"],
      ["Trần Thị B", "SV002", "b@example.com"],
      ["Lê Văn C", "sv001", "c@example.com"],
      ["Không mã", "", "missing@example.com"],
    ])

    expect(result).toEqual(["SV001", "SV002"])
  })

  it("falls back to the first column when no supported header exists", () => {
    const result = parseStudentCodesFromRows([
      ["sv010", "Nguyễn Văn A"],
      ["SV011", "Trần Thị B"],
      ["sv010", "Duplicate"],
    ])

    expect(result).toEqual(["SV010", "SV011"])
  })

  it("parses CSV rows with quoted commas", () => {
    expect(parseCsvRows('name,ma sinh vien\n"Nguyen, Van A",sv001\nTran Thi B,SV002')).toEqual([
      ["name", "ma sinh vien"],
      ["Nguyen, Van A", "sv001"],
      ["Tran Thi B", "SV002"],
    ])
  })
})
