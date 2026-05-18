import Link from "next/link"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GroupData } from "./mock-data"

interface SidebarGroupItemProps {
  group: GroupData
  className?: string
}

export function SidebarGroupItem({ group, className }: SidebarGroupItemProps) {
  return (
    <Link
      href={group.href}
      className={cn(
        "group flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-muted transition-colors",
        className
      )}
    >
      {/* Icon tròn */}
      <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Users className="size-4 text-muted-foreground" />
      </div>

      {/* Tên + số thành viên */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{group.name}</p>
        <p className="text-xs text-muted-foreground">
          {group.memberCount} thành viên
        </p>
      </div>

      {/* Nút Xem */}
      <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        Xem
      </span>
    </Link>
  )
}
