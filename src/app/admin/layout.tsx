import { redirect } from "next/navigation"

import { getBaseRoleLabel } from "@/lib/auth/base-role"
import { requireAdminAccess } from "@/lib/auth/authorization"
import { AppError } from "@/lib/errors"

import { AdminLayoutClient } from "./admin-layout-client"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const context = await requireAdminAccess()

    return (
      <AdminLayoutClient
        user={{
          name: context.profile.displayName,
          role: getBaseRoleLabel(context.baseRole),
          avatarSrc: context.profile.avatarUrl ?? undefined,
        }}
      >
        {children}
      </AdminLayoutClient>
    )
  } catch (error) {
    if (error instanceof AppError) {
      redirect("/feed")
    }

    throw error
  }
}
