import { notFound } from "next/navigation"

import { requireSystemAdmin } from "@/lib/auth/authorization"
import { getUserAccessEditorData } from "@/lib/admin/users/users-admin-data"
import {
  listActiveAnnouncementUnitAssignmentsForUser,
  listActiveOrganizationUnits,
} from "@/lib/announcements/units"

import { UserAccessForm } from "./user-access-form"

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const [, editorData, activeOrganizationUnits, announcementUnitAssignments] = await Promise.all([
    requireSystemAdmin(),
    getUserAccessEditorData(userId),
    listActiveOrganizationUnits(),
    listActiveAnnouncementUnitAssignmentsForUser(userId),
  ])

  if (!editorData) {
    notFound()
  }

  return (
    <UserAccessForm
      user={editorData.user}
      adminRoles={editorData.adminRoles}
      activeOrganizationUnits={activeOrganizationUnits.map(({ id, code, name, type }) => ({
        id,
        code,
        name,
        type,
      }))}
      announcementUnitAssignments={announcementUnitAssignments}
    />
  )
}
