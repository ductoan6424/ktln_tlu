import { SignOutOthersButton } from "@/components/auth/sign-out-others-button"
import { PushDevicesManager } from "@/components/pwa/push-devices-manager"
import { ContactEmailSection } from "@/components/settings/contact-email-section"
import { SectionHeader } from "@/components/shared/section-header"
import { Card, CardContent } from "@/components/ui/card"
import { ChangePasswordSection } from "./change-password-section"

export function SecuritySection({ contactEmail }: { contactEmail: string | null }) {
  return (
    <div className="space-y-6">
      <ContactEmailSection currentEmail={contactEmail} />
      <ChangePasswordSection />

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <SectionHeader title="Thông báo đẩy" />
            <p className="text-xs text-muted-foreground">
              Quản lý bật/tắt và các trình duyệt/PWA đã đăng ký nhận thông báo.
            </p>
          </div>
          <PushDevicesManager />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <SectionHeader title="Phiên đăng nhập" />
            <p className="text-xs text-muted-foreground">
              Thu hồi đăng nhập trên các thiết bị khác. Phiên hiện tại được giữ nguyên.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Vì lý do bảo mật, hệ thống không hiển thị danh sách phiên cụ thể.
          </p>
          <div className="flex justify-start">
            <SignOutOthersButton />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
