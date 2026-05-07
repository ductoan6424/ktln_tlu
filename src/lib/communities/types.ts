export type CommunityType = "GROUP" | "CLUB" | "COURSE"
export type CommunityMemberRole = "ADMIN" | "MODERATOR" | "MEMBER"
export type CommunityChatMode = "OPEN" | "ADMINS_ONLY" | "READ_ONLY"
export type CommunityVisibility = "PUBLIC" | "PRIVATE"

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
