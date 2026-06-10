import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { Bell, EyeOff, Palette, Shield, User } from "lucide-react"

import { PageContainer } from "@/components/layout/page-container"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { prisma } from "@/lib/prisma/client"
import { getUserSettings } from "@/lib/settings/user-settings"
import { createClient } from "@/lib/supabase/server"
import { AppearanceSection } from "./appearance-section"
import { NotificationsSection } from "./notifications-section"
import { ProfileSection, type UserProfile } from "./profile-section"
import { SecuritySection } from "./security-section"

export const metadata: Metadata = { title: "Cài đặt" }

const SETTINGS_NAV = [
  { icon: User, label: "Hồ sơ cá nhân", value: "profile" },
  { icon: Bell, label: "Thông báo", value: "notifications" },
  { icon: Shield, label: "Bảo mật", value: "security" },
  { icon: Palette, label: "Giao diện", value: "appearance" },
] as const

const VALID_SECTIONS = new Set<string>(SETTINGS_NAV.map((item) => item.value))

const SETTINGS_LINKS = [
  { icon: EyeOff, label: "Bài viết đã ẩn", href: "/settings/hidden-posts" },
]

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  return prisma.userProfile.findUnique({
    where: { userId },
    select: {
      displayName: true,
      studentId: true,
      avatarUrl: true,
      bio: true,
      major: true,
      year: true,
      email: true,
    },
  })
}

async function getContactEmail(userId: string) {
  return prisma.userContactEmail.findUnique({
    where: { userId },
    select: { email: true },
  })
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) redirect("/login")

  const { section } = await searchParams
  const activeSection = section ?? "profile"
  if (!VALID_SECTIONS.has(activeSection)) {
    redirect("/settings?section=profile")
  }

  const [profile, contactEmail, settings] = await Promise.all([
    getUserProfile(authData.user.id),
    getContactEmail(authData.user.id),
    getUserSettings(authData.user.id),
  ])

  return (
    <PageContainer variant="centered" className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Cài đặt</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý tài khoản và tuỳ chỉnh trải nghiệm
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-0.5">
                {SETTINGS_NAV.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.value
                  return (
                    <Link
                      key={item.value}
                      href={`/settings?section=${item.value}`}
                      className={`
                        flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors
                        ${isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  )
                })}
                <Separator className="my-1" />
                {SETTINGS_LINKS.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </aside>

        <section className="lg:col-span-9">
          {activeSection === "profile" && profile && <ProfileSection profile={profile} />}
          {activeSection === "notifications" && <NotificationsSection settings={settings} />}
          {activeSection === "security" && (
            <SecuritySection contactEmail={contactEmail?.email ?? null} />
          )}
          {activeSection === "appearance" && <AppearanceSection settings={settings} />}
        </section>
      </div>
    </PageContainer>
  )
}
