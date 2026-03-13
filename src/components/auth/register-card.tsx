"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function validateRegisterForm(formData: FormData): string | null {
  const fullName = String(formData.get("fullName") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const studentId = String(formData.get("studentId") ?? "").trim()
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")
  const agreeTerms = formData.get("agreeTerms")

  if (fullName.length < 2) return "Họ và tên phải có ít nhất 2 ký tự."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email không hợp lệ."
  if (!/^[a-zA-Z0-9]+$/.test(studentId)) return "Mã sinh viên chỉ gồm chữ và số."
  if (studentId.length < 6 || studentId.length > 15) {
    return "Mã sinh viên cần từ 6 đến 15 ký tự."
  }
  if (!/^[a-zA-Z0-9._-]{4,20}$/.test(username)) {
    return "Tên đăng nhập từ 4-20 ký tự, chỉ chứa chữ, số, dấu chấm, gạch dưới hoặc gạch nối."
  }
  if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự."
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Mật khẩu cần có cả chữ và số."
  }
  if (password !== confirmPassword) return "Xác nhận mật khẩu không khớp."
  if (!agreeTerms) return "Bạn cần đồng ý với Điều khoản dịch vụ."

  return null
}

export function RegisterCard() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const validationError = validateRegisterForm(formData)

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setErrorMessage(null)
    window.alert("Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.")
    router.push("/login")
  }

  return (
    <Card className="shadow-2xl shadow-foreground/5 border">
      <CardContent className="p-8 lg:p-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Tạo tài khoản mới</h1>
          <p className="text-muted-foreground text-sm">
            Điền thông tin để đăng ký tài khoản
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Input type="text" name="fullName" placeholder="Họ và tên" required />
          <Input type="email" name="email" placeholder="Email" required />
          <Input type="text" name="studentId" placeholder="Mã sinh viên" required />
          <Input type="text" name="username" placeholder="Tên đăng nhập" required />
          <Input type="password" name="password" placeholder="Mật khẩu" required />
          <Input
            type="password"
            name="confirmPassword"
            placeholder="Xác nhận mật khẩu"
            required
          />

          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              name="agreeTerms"
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>
              Tôi đồng ý với{" "}
              <Link
                href="/terms"
                className="text-primary hover:underline underline-offset-4"
              >
                Điều khoản dịch vụ
              </Link>
            </span>
          </label>

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full">
            Đăng ký
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline underline-offset-4"
            >
              Đăng nhập
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
