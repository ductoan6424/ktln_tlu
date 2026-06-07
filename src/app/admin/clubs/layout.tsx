import { requireAdminPermission } from "@/lib/auth/authorization"

export default async function AdminClubsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminPermission("admin.clubs.manage")

  return children
}
