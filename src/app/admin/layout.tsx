import { redirect } from "next/navigation"

import { getBaseRoleLabel } from "@/lib/auth/base-role"
import { requireAdminAccess } from "@/lib/auth/authorization"
import { AppError } from "@/lib/errors"

import { AdminLayoutClient } from "./admin-layout-client"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const context = await requireAdminAccess().catch((error: unknown) => {
    if (error instanceof AppError) {
      return null
    }

    throw error
  })

  if (!context) {
    redirect("/feed")
  }

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
}
