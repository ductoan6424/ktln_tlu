"use client"

import { Card, CardContent } from "@/components/ui/card"
import { SsoButton } from "@/components/auth/sso-button"
import { DividerLabel } from "@/components/shared/divider-label"
import { Skeleton } from "@/components/ui/skeleton"
import { LogIn, User } from "lucide-react"
import Link from "next/link"

export function LoginCard() {
  return (
    <Card className="shadow-2xl shadow-foreground/5 border">
      <CardContent className="p-5 sm:p-8 lg:p-10">
        {/* Tiêu đề */}
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="text-2xl font-bold mb-2">Chào mừng trở lại</h1>
          <p className="text-muted-foreground text-sm">
            Truy cập cổng thông tin sinh viên
          </p>
        </div>

        {/* Nút đăng nhập */}
        <div className="space-y-4">
          <SsoButton
            icon={LogIn}
            label="Đăng nhập bằng tài khoản trường"
            variant="primary"
          />

          <DividerLabel label="hoặc" />

          <SsoButton
            icon={User}
            label="Đăng nhập Giảng viên / Khách"
            variant="secondary"
          />
        </div>

        {/* Điều khoản */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Khi đăng nhập, bạn đồng ý với{" "}
            <Link
              href="/terms"
              className="text-primary hover:underline underline-offset-4"
            >
              Điều khoản dịch vụ
            </Link>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function LoginCardSkeleton() {
  return (
    <Card className="shadow-2xl shadow-foreground/5 border">
      <CardContent className="space-y-6 p-5 sm:p-8 lg:p-10">
        <div className="text-center space-y-2">
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-4 w-56 mx-auto" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-4 w-12 mx-auto" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-3 w-48 mx-auto" />
      </CardContent>
    </Card>
  )
}
