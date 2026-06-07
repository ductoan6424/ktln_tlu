import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { Card, CardContent } from "@/components/ui/card"

export default function AdminSubjectSettingsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cài đặt lớp học"
        description="Các cài đặt lớp học hiện được quản lý riêng trên từng lớp."
        secondaryActions={[
          { label: "Quay lại danh sách", href: "/admin/subjects", variant: "outline" },
        ]}
      />
      <Card>
        <CardContent className="space-y-2 p-6">
          <h2 className="text-lg font-semibold">Cấu hình theo từng lớp</h2>
          <p className="text-sm text-muted-foreground">
            Hãy mở chi tiết lớp học để thay đổi giảng viên phụ trách, duyệt bài viết,
            chat và danh sách sinh viên.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
