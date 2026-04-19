import { notFound } from "next/navigation"

import { AdminFormPageShell } from "@/components/admin/shells/admin-form-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const subjectsModule = getAdminModule("subjects")

export default async function AdminEditSubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>
}) {
  const { subjectId } = await params
  const record = subjectsModule.getRecord(subjectId)

  if (!record) {
    notFound()
  }

  return <AdminFormPageShell module={subjectsModule} mode="edit" record={record} />
}
