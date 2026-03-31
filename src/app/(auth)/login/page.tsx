import type { Metadata } from "next"
import { LoginCard } from "@/components/auth/login-card"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Đăng nhập — TLU Community",
  description: "Đăng nhập vào cổng thông tin sinh viên Đại học Thủy lợi",
}

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <LoginCard />

      {/* Hỗ trợ */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Cần hỗ trợ?{" "}
          <Link
            href="/support"
            className="text-primary font-medium hover:underline underline-offset-4"
          >
            Liên hệ quản trị hệ thống
          </Link>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          <Link
            href="/forgot-password"
            className="text-primary/70 hover:text-primary font-medium hover:underline underline-offset-4 transition-colors"
          >
            Quên mật khẩu?
          </Link>
        </p>
      </div>
    </div>
  )
}
