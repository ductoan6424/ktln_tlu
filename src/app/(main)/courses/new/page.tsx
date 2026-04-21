import { requireCourseCreator } from "@/lib/courses/course-permissions"

import { NewCourseForm } from "./new-course-form"

export const dynamic = "force-dynamic"

export default async function NewCoursePage() {
  await requireCourseCreator()

  return <NewCourseForm />
}
