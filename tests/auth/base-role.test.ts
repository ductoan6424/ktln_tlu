import { describe, expect, it } from "vitest"

import {
  assertBaseRole,
  BASE_ROLE_VALUES,
  getBaseRoleLabel,
  isBaseRole,
} from "@/lib/auth/base-role"
import { USER_ROLES } from "@/lib/auth/types"

describe("base roles", () => {
  it("supports exactly the three normalized base roles", () => {
    expect(BASE_ROLE_VALUES).toEqual(["STUDENT", "LECTURER", "ADMIN"])
    expect(USER_ROLES).toEqual({
      STUDENT: "STUDENT",
      LECTURER: "LECTURER",
      ADMIN: "ADMIN",
    })
  })

  it("returns Vietnamese labels for supported roles", () => {
    expect(getBaseRoleLabel("STUDENT")).toBe("Sinh viên")
    expect(getBaseRoleLabel("LECTURER")).toBe("Giảng viên")
    expect(getBaseRoleLabel("ADMIN")).toBe("Quản trị viên")
  })

  it("rejects legacy CLUB_ADMIN values", () => {
    expect(isBaseRole("CLUB_ADMIN")).toBe(false)
    expect(() => assertBaseRole("CLUB_ADMIN")).toThrow("Vai trò không hợp lệ")
  })
})
