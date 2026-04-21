import { requireAdminPermission } from "@/lib/auth/authorization"

export default async function AdminSubjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminPermission("admin.subjects.manage")

  return children
}
