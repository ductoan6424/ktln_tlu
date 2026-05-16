import Link from "next/link"
import { BookOpen, Lock, Shield, Users } from "lucide-react"

import { CommunityJoinButton } from "@/components/communities/community-join-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { JoinMode } from "@/lib/communities/policy"
import type { CommunityType, CommunityVisibility } from "@/lib/communities/types"

export type CommunityCardStatus = "JOINED" | "PENDING" | "INVITED" | "AVAILABLE"

export type CommunityCardItem = {
  type: CommunityType
  name: string
  description: string | null
  href: string
  slugId: string
  visibility: CommunityVisibility | null
  memberCount: number
  status: CommunityCardStatus
}

const TYPE_LABELS: Record<CommunityType, string> = {
  GROUP: "Nhóm",
  CLUB: "CLB",
  COURSE: "Lớp học",
}

const STATUS_LABELS: Record<CommunityCardStatus, string> = {
  JOINED: "Đã tham gia",
  PENDING: "Đang chờ duyệt",
  INVITED: "Được mời",
  AVAILABLE: "Xem",
}

function CommunityTypeIcon({ type }: { type: CommunityType }) {
  if (type === "COURSE") return <BookOpen className="size-5" />
  if (type === "CLUB") return <Shield className="size-5" />
  return <Users className="size-5" />
}

function getAvailableJoinMode(item: CommunityCardItem): Exclude<JoinMode, "NONE"> {
  if (item.type === "COURSE" || item.visibility === "PRIVATE") return "REQUEST"
  return "JOIN_NOW"
}

export function CommunityCard({ item }: { item: CommunityCardItem }) {
  const isPrivate = item.visibility === "PRIVATE"

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CommunityTypeIcon type={item.type} />
          </div>
          <div className="min-w-0 flex-1">
            <Link href={item.href} className="font-semibold hover:text-primary">
              {item.name}
            </Link>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {item.description ?? "Chưa có mô tả."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{TYPE_LABELS[item.type]}</Badge>
          {item.visibility ? (
            <Badge variant="outline" className="gap-1">
              {isPrivate ? <Lock className="size-3" /> : null}
              {isPrivate ? "Riêng tư" : "Công khai"}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">{item.memberCount} thành viên</span>
          {item.status === "AVAILABLE" ? (
            <CommunityJoinButton
              type={item.type}
              slugId={item.slugId}
              mode={getAvailableJoinMode(item)}
              size="sm"
            />
          ) : (
            <Link href={item.href}>
              <Button variant="outline" size="sm">
                {STATUS_LABELS[item.status]}
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
