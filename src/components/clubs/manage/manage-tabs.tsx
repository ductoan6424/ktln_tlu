"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { MemberManageList } from "./member-manage-list"
import { PostManageList } from "./post-manage-list"
import { EventManageList } from "./event-manage-list"
import { SettingsForm } from "./settings-form"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { Users, FileText, CalendarDays, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const MANAGE_TABS = [
  { label: "Thành viên", value: "members", icon: Users },
  { label: "Bài viết", value: "posts", icon: FileText },
  { label: "Sự kiện", value: "events", icon: CalendarDays },
  { label: "Cài đặt", value: "settings", icon: Settings },
]

export function ManageTabs() {
  const [activeTab, setActiveTab] = useState("members")

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <Card>
        <CardContent className="p-0">
          <TabNavigation
            tabs={MANAGE_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </CardContent>
      </Card>

      {/* Tab content */}
      <div className={cn(activeTab !== "members" && "hidden")}>
        <MemberManageList />
      </div>
      <div className={cn(activeTab !== "posts" && "hidden")}>
        <PostManageList />
      </div>
      <div className={cn(activeTab !== "events" && "hidden")}>
        <EventManageList />
      </div>
      <div className={cn(activeTab !== "settings" && "hidden")}>
        <SettingsForm />
      </div>
    </div>
  )
}
