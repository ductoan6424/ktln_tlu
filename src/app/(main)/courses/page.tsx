"use client"

import Link from "next/link"
import { useState } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { SearchInput } from "@/components/shared/search-input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type CourseStatus = "active" | "upcoming" | "completed"

interface Course {
  id: string
  name: string
  subject: string
  studentCount: number
  color: string
  initials: string
  status: CourseStatus
}

const COURSES: Course[] = [
  {
    id: "cs101",
    name: "Lập trình Python",
    subject: "CS101",
    studentCount: 45,
    color: "bg-emerald-500",
    initials: "LT",
    status: "active",
  },
  {
    id: "cntt",
    name: "Công nghệ thông tin",
    subject: "CNTT",
    studentCount: 120,
    color: "bg-violet-500",
    initials: "CT",
    status: "upcoming",
  },
  {
    id: "ktso",
    name: "Kỹ thuật số",
    subject: "KTSO",
    studentCount: 30,
    color: "bg-amber-500",
    initials: "KS",
    status: "completed",
  },
  {
    id: "java",
    name: "Lập trình Java",
    subject: "CS102",
    studentCount: 80,
    color: "bg-blue-500",
    initials: "LJ",
    status: "active",
  },
]

const STATUS_CONFIG: Record<CourseStatus, { label: string; dotClass: string }> = {
  active: { label: "Đang học", dotClass: "bg-emerald-500" },
  upcoming: { label: "Sắp bắt đầu", dotClass: "bg-amber-500" },
  completed: { label: "Đã hoàn thành", dotClass: "bg-red-500" },
}

export default function CoursesPage() {
  const [search, setSearch] = useState("")

  const filtered = COURSES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageContainer variant="centered">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Môn học</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chọn môn học để xem chi tiết
          </p>
        </div>

        {/* Thanh tìm kiếm */}
        <SearchInput
          placeholder="Tìm kiếm môn học..."
          value={search}
          onChange={(value) => setSearch(value)}
          className="max-w-sm"
        />

        {/* Grid danh sách môn học */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-8">
              Không tìm thấy môn học nào
            </p>
          ) : (
            filtered.map((course) => {
              const statusConfig = STATUS_CONFIG[course.status]

              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="group block"
                >
                  <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/50 transition-all">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "size-12 rounded-lg text-white flex items-center justify-center text-lg font-bold shrink-0",
                          course.color
                        )}
                      >
                        {course.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                          {course.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {course.subject}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{course.studentCount} sinh viên</span>
                        </div>
                      </div>
                    </div>

                    {/* Trạng thái */}
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      <div
                        className={cn(
                          "size-2 rounded-full shrink-0",
                          statusConfig.dotClass
                        )}
                      />
                      <span className="text-xs text-muted-foreground">
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </PageContainer>
  )
}