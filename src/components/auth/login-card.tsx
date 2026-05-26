"use client"

import { Card, CardContent } from "@/components/ui/card"
import { SsoButton } from "@/components/auth/sso-button"
import { DividerLabel } from "@/components/shared/divider-label"
import { Skeleton } from "@/components/ui/skeleton"
import { LogIn, User } from "lucide-react"
import Link from "next/link"

export function LoginCard() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-7 p-6 sm:p-8">
        {/* Tiêu đề */}
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold">Chào mừng trở lại</h1>
          <p className="text-muted-foreground text-sm">
            Truy cập cổng thông tin sinh viên
          </p>
        </div>

        {/* Nút đăng nhập */}
        <div className="flex flex-col gap-4">
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
        <div className="border-t border-border/70 pt-6 text-center">
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
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-2 text-center">
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-4 w-56 mx-auto" />
        </div>
        <div className="flex flex-col gap-4">
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
