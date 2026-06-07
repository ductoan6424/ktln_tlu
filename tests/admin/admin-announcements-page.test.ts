import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAdminPermission = vi.hoisted(() => vi.fn())
const listAdminAnnouncements = vi.hoisted(() => vi.fn())
const listActiveOrganizationUnits = vi.hoisted(() => vi.fn())
const listActiveAnnouncementUnitAssignmentsForUser = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  faculty: { findMany: vi.fn() },
  course: { findMany: vi.fn() },
  userProfile: { findMany: vi.fn() },
}))
const refresh = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}))
vi.mock("@/actions/announcements", () => ({
  createAnnouncement: vi.fn(),
  updateAnnouncement: vi.fn(),
  submitAnnouncementForReview: vi.fn(),
  publishAnnouncement: vi.fn(),
  withdrawAnnouncement: vi.fn(),
  createReplacementAnnouncement: vi.fn(),
}))
vi.mock("@/lib/auth/authorization", () => ({ requireAdminPermission }))
vi.mock("@/lib/announcements/queries", () => ({ listAdminAnnouncements }))
vi.mock("@/lib/announcements/units", () => ({
  listActiveOrganizationUnits,
  listActiveAnnouncementUnitAssignmentsForUser,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))

const activeUnits = [
  {
    id: "unit-department-dao-tao",
    code: "DEPARTMENT_DAO_TAO",
    name: "Phong Dao tao",
    type: "DEPARTMENT",
    facultyId: null,
    clubId: null,
    groupId: null,
  },
  {
    id: "unit-department-ctsv",
    code: "DEPARTMENT_CTCTSV",
    name: "Phong Cong tac Sinh vien",
    type: "DEPARTMENT",
    facultyId: null,
    clubId: null,
    groupId: null,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  requireAdminPermission.mockResolvedValue({
    profile: { userId: "admin-1" },
    baseRole: "ADMIN",
  })
  listAdminAnnouncements.mockResolvedValue({ items: [], total: 0 })
  listActiveOrganizationUnits.mockResolvedValue(activeUnits)
  listActiveAnnouncementUnitAssignmentsForUser.mockResolvedValue([])
  prisma.faculty.findMany.mockResolvedValue([])
  prisma.course.findMany.mockResolvedValue([])
  prisma.userProfile.findMany.mockResolvedValue([])
})

describe("admin announcements page", () => {
  it("shows every active issuing unit to a system admin even without unit assignments", async () => {
    const page = await import("@/app/admin/announcements/page")

    const markup = renderToStaticMarkup(await page.default())

    expect(markup).toContain("Phong Dao tao")
    expect(markup).toContain("Phong Cong tac Sinh vien")
    expect(requireAdminPermission).toHaveBeenCalledWith(
      "admin.announcements.manage",
    )
    expect(listActiveAnnouncementUnitAssignmentsForUser).toHaveBeenCalledWith(
      "admin-1",
    )
  })

  it("limits a delegated announcement manager to assigned AUTHOR units", async () => {
    requireAdminPermission.mockResolvedValueOnce({
      profile: { userId: "manager-1" },
      baseRole: "LECTURER",
    })
    listActiveAnnouncementUnitAssignmentsForUser.mockResolvedValueOnce([
      { unitId: "unit-department-ctsv", role: "AUTHOR" },
    ])
    const page = await import("@/app/admin/announcements/page")

    const markup = renderToStaticMarkup(await page.default())

    expect(markup).not.toContain("Phong Dao tao")
    expect(markup).toContain("Phong Cong tac Sinh vien")
  })
})
