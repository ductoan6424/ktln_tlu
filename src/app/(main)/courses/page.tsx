import Link from "next/link"

import { getAuthorizationContext } from "@/lib/auth/authorization"
import { listCourses } from "@/lib/courses/course-queries"
import { PageContainer } from "@/components/layout/page-container"
import { SearchInput } from "@/components/shared/search-input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

export default async function CoursesPage() {
  const [courses, context] = await Promise.all([
    listCourses(),
    getAuthorizationContext().catch(() => null),
  ])
  const canCreateCourse = Boolean(
    context && (context.baseRole === "LECTURER" || context.baseRole === "ADMIN"),
  )

  return (
    <PageContainer variant="centered">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Môn học</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Danh sách lớp học do giảng viên quản lý trong hệ thống.
            </p>
          </div>
          {canCreateCourse ? (
            <Link href="/courses/new">
              <Button>Tạo lớp học</Button>
            </Link>
          ) : null}
        </div>

        <SearchInput placeholder="Tìm kiếm môn học..." className="max-w-sm" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.length === 0 ? (
            <p className="col-span-full rounded-xl border border-dashed py-10 text-center text-muted-foreground">
              Chưa có lớp học nào được tạo.
            </p>
          ) : (
            courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="rounded-xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="space-y-3">
                  <div>
                    <h2 className="font-semibold">{course.name}</h2>
                    <p className="text-xs text-muted-foreground">{course.code}</p>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{course._count.members} sinh viên</p>
                    <p>{course.lecturer.displayName}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  )
}

export function CoursesPageSkeleton() {
  return (
    <PageContainer variant="centered">
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
