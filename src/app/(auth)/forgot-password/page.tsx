import type { Metadata } from "next"
import { ForgotPasswordCard } from "@/components/auth/forgot-password-card"

export const metadata: Metadata = {
  title: "Quên mật khẩu - TLU Community",
  description: "Khôi phục mật khẩu bằng email và mã OTP",
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordCard />
}
