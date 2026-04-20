import { notFound } from "next/navigation"

import { AdminDetailPageShell } from "@/components/admin/shells/admin-detail-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const subjectsModule = getAdminModule("subjects")

export default async function AdminSubjectDetailPage({
  params,
}: {
  params: Promise<{ subjectId: string }>
}) {
  const { subjectId } = await params

  if (!subjectsModule.getRecord(subjectId)) {
    notFound()
  }

  return <AdminDetailPageShell module={subjectsModule} recordId={subjectId} />
}
