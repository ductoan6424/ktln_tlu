import { AdminCourseForm } from "@/components/admin/courses/admin-course-form"
import { listCourseLecturerOptions } from "@/lib/admin/courses/courses-admin-data"

export const dynamic = "force-dynamic"

export default async function AdminNewSubjectPage() {
  const lecturers = await listCourseLecturerOptions()

  return <AdminCourseForm lecturers={lecturers} />
}
