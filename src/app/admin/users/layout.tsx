import { requireAdminPermission } from "@/lib/auth/authorization"

export default async function AdminUsersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminPermission("admin.users.read")

  return children
}
