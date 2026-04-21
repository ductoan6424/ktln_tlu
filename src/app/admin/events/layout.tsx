import { requireAdminPermission } from "@/lib/auth/authorization"

export default async function AdminEventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminPermission("admin.events.manage")

  return children
}
