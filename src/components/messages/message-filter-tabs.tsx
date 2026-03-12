import { TabNavigation } from "@/components/shared/tab-navigation"

const FILTER_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Chưa đọc", value: "unread" },
  { label: "Nhóm", value: "groups" },
  { label: "Lưu trữ", value: "archived" },
]

interface MessageFilterTabsProps {
  activeTab: string
  onTabChange: (value: string) => void
}

export function MessageFilterTabs({
  activeTab,
  onTabChange,
}: MessageFilterTabsProps) {
  return (
    <TabNavigation
      tabs={FILTER_TABS}
      activeTab={activeTab}
      onTabChange={onTabChange}
      variant="pill"
    />
  )
}
