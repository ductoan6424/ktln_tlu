import type { Metadata } from "next"
import { ForgotPasswordCard } from "@/components/auth/forgot-password-card"

export const metadata: Metadata = {
  title: "Quên mật khẩu — TLU Community",
  description: "Khôi phục mật khẩu tài khoản TLU Community của bạn",
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordCard />
}
