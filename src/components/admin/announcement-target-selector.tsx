"use client"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"

export type AnnouncementTargetValue = {
  type: "ROLE" | "FACULTY" | "COHORT" | "COURSE" | "CLUB" | "GROUP" | "USER"
  value: string
}

export type AnnouncementTargetOptions = {
  faculties: Array<{ id: string; code: string; name: string }>
  courses: Array<{ id: string; code: string; name: string }>
  cohorts: Array<{ value: string; label: string }>
}

const ROLE_OPTIONS = [
  { value: "STUDENT", label: "Sinh viên" },
  { value: "LECTURER", label: "Giảng viên" },
  { value: "ADMIN", label: "Quản trị viên" },
]

const COHORT_OPTIONS = [34, 35, 36, 37, 38].map((year) => ({
  value: String(year),
  label: `K${year}`,
}))

function hasTarget(
  targets: AnnouncementTargetValue[],
  type: AnnouncementTargetValue["type"],
  value: string,
) {
  return targets.some((target) => target.type === type && target.value === value)
}

function toggleTarget(
  targets: AnnouncementTargetValue[],
  target: AnnouncementTargetValue,
): AnnouncementTargetValue[] {
  if (hasTarget(targets, target.type, target.value)) {
    return targets.filter(
      (item) => !(item.type === target.type && item.value === target.value),
    )
  }
  return [...targets, target]
}

export function AnnouncementTargetSelector({
  value,
  onChange,
  options,
  className,
}: {
  value: AnnouncementTargetValue[]
  onChange: (value: AnnouncementTargetValue[]) => void
  options: AnnouncementTargetOptions
  className?: string
}) {
  const cohortOptions = options.cohorts.length > 0 ? options.cohorts : COHORT_OPTIONS

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Vai trò</p>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={hasTarget(value, "ROLE", option.value) ? "default" : "secondary"}
              size="sm"
              className="rounded-full"
              onClick={() => onChange(toggleTarget(value, { type: "ROLE", value: option.value }))}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Khoa</p>
        {options.faculties.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Chưa có dữ liệu khoa. Hệ thống sẽ lấy từ dữ liệu import tài khoản.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {options.faculties.map((faculty) => (
              <Button
                key={faculty.id}
                type="button"
                variant={hasTarget(value, "FACULTY", faculty.id) ? "default" : "secondary"}
                size="sm"
                className="rounded-full"
                title={faculty.name}
                onClick={() => onChange(toggleTarget(value, { type: "FACULTY", value: faculty.id }))}
              >
                {faculty.code}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Khoá</p>
        <div className="flex flex-wrap gap-2">
          {cohortOptions.map((cohort) => (
            <Button
              key={cohort.value}
              type="button"
              variant={hasTarget(value, "COHORT", cohort.value) ? "default" : "secondary"}
              size="sm"
              className="rounded-full"
              onClick={() => onChange(toggleTarget(value, { type: "COHORT", value: cohort.value }))}
            >
              {cohort.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Lớp học phần</p>
        {options.courses.length === 0 ? (
          <p className="text-xs text-muted-foreground">Chưa có lớp học phần.</p>
        ) : (
          <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border border-border p-2">
            {options.courses.map((course) => (
              <Button
                key={course.id}
                type="button"
                variant={hasTarget(value, "COURSE", course.id) ? "default" : "secondary"}
                size="sm"
                className="rounded-full"
                title={course.name}
                onClick={() => onChange(toggleTarget(value, { type: "COURSE", value: course.id }))}
              >
                {course.code}
              </Button>
            ))}
          </div>
        )}
      </div>

      {value.length === 0 ? (
        <StatusBadge variant="info" size="sm">
          Mặc định: toàn trường
        </StatusBadge>
      ) : (
        <p className="text-xs text-muted-foreground">
          Đã chọn {value.length} điều kiện nhận. Cùng nhóm là OR, khác nhóm là AND.
        </p>
      )}
    </div>
  )
}
