import type {
  CommunityChatMode,
  CommunityType,
  CommunityVisibility,
} from "@/types/database"

export type {
  CommunityChatMode,
  CommunityMemberRole,
  CommunityType,
  CommunityVisibility,
} from "@/types/database"

export type CommunityTarget = {
  type: CommunityType
  id: string
  shortId: string
  name: string
}

export type CommunityContext = CommunityTarget & {
  visibility: CommunityVisibility | null
  requirePostApproval: boolean
  chatEnabled: boolean
  chatMode: CommunityChatMode
  memberInviteEnabled: boolean
  lecturerId: string | null
}
