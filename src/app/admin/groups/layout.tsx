import { requireAdminPermission } from "@/lib/auth/authorization"

export default async function AdminGroupsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminPermission("admin.groups.manage")

  return children
}
