import { updateUserAccess } from "@/actions/admin-users"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getBaseRoleLabel } from "@/lib/auth/base-role"

interface UserAccessFormProps {
  user: {
    userId: string
    email: string
    displayName: string
    baseRole: "STUDENT" | "LECTURER" | "ADMIN"
    major: string | null
    studentId: string | null
    adminRoleIds: string[]
    adminRoleNames: string[]
  }
  adminRoles: Array<{
    id: string
    code: string
    name: string
    description: string | null
    isSystem: boolean
  }>
}

export function UserAccessForm({ user, adminRoles }: UserAccessFormProps) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Cập nhật ${user.displayName}`}
        description="Quản trị viên có thể thay đổi vai trò nền và gói quyền quản trị của người dùng tại đây."
        secondaryActions={[
          { label: "Quay lại chi tiết", href: `/admin/users/${user.userId}`, variant: "outline" },
          { label: "Quay lại danh sách", href: "/admin/users", variant: "outline" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form
          action={async (formData) => {
            "use server"
            await updateUserAccess(formData)
          }}
          className="space-y-6"
        >
          <input type="hidden" name="userId" value={user.userId} />

          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Vai trò nền</h2>
                <p className="text-sm text-muted-foreground">
                  Vai trò nền điều khiển quyền nghiệp vụ thường của người dùng.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {(["STUDENT", "LECTURER", "ADMIN"] as const).map((role) => (
                  <label key={role} htmlFor={`base-role-${role}`} aria-label={getBaseRoleLabel(role)} className="flex items-start gap-3 rounded-xl border p-4">
                    <input
                      id={`base-role-${role}`}
                      type="radio"
                      name="baseRole"
                      value={role}
                      defaultChecked={user.baseRole === role}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <div className="font-medium">{getBaseRoleLabel(role)}</div>
                      <p className="text-sm text-muted-foreground">
                        {role === "STUDENT"
                          ? "User thông thường với quyền bài viết, bình luận, like và group."
                          : role === "LECTURER"
                            ? "Có toàn quyền nghiệp vụ của sinh viên và quản lý lớp trong /courses."
                            : "Full access và là role duy nhất được cấp/thu hồi quyền cho người khác."}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Gói quyền quản trị</h2>
                <p className="text-sm text-muted-foreground">
                  Các gói quyền này chỉ áp dụng trong khu vực <code>/admin</code>.
                </p>
              </div>

              <div className="space-y-3">
                {adminRoles.map((role) => (
                  <label key={role.id} htmlFor={`admin-role-${role.id}`} aria-label={role.name} className="flex items-start justify-between gap-4 rounded-xl border p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-medium">
                        <span>{role.name}</span>
                        {role.isSystem ? (
                          <Badge variant="secondary">Hệ thống</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {role.description ?? role.code}
                      </p>
                    </div>
                    <input
                      id={`admin-role-${role.id}`}
                      type="checkbox"
                      name="adminRoleIds"
                      value={role.id}
                      defaultChecked={user.adminRoleIds.includes(role.id)}
                      className="mt-1"
                    />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">Lưu phân quyền</Button>
          </div>
        </form>

        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Tóm tắt tài khoản</h2>
              <p className="text-sm text-muted-foreground">
                Kiểm tra nhanh trước khi lưu thay đổi.
              </p>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Họ và tên</dt>
                <dd className="font-medium">{user.displayName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Mã sinh viên</dt>
                <dd className="font-medium">{user.studentId ?? "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Khoa</dt>
                <dd className="font-medium">{user.major ?? "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Gói quyền quản trị hiện tại</dt>
                <dd className="font-medium">
                  {user.adminRoleNames.length > 0
                    ? user.adminRoleNames.join(", ")
                    : "Chưa có gói quyền quản trị"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
