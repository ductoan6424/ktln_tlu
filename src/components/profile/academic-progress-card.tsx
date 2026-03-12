import { Card, CardContent } from "@/components/ui/card"
import { ProgressBar } from "@/components/shared/progress-bar"
import { StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { GraduationCap } from "lucide-react"

interface AcademicProgressCardProps {
  credits: number
  totalCredits: number
  gpa: number
  deansListCount: number
  year: string
}

export function AcademicProgressCard({
  credits,
  totalCredits,
  gpa,
  deansListCount,
  year,
}: AcademicProgressCardProps) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <GraduationCap className="size-4" />
            Tiến trình học tập
          </h3>
          <StatusBadge variant="primary" size="sm">
            {year}
          </StatusBadge>
        </div>

        {/* Tín chỉ */}
        <ProgressBar
          value={credits}
          max={totalCredits}
          label="Tín chỉ tích lũy"
          showCount
        />

        {/* GPA + Dean's List */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">GPA hiện tại</p>
            <p className="text-2xl font-bold text-primary">{gpa.toFixed(2)}</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Danh hiệu giỏi</p>
            <p className="text-2xl font-bold text-primary">{deansListCount}x</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AcademicProgressCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}
