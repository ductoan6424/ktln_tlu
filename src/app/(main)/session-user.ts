export interface SessionUser {
  name: string
  subtitle?: string
  avatarSrc?: string
  canAccessAdmin?: boolean
}

type AuthUserLike = {
  email?: string | null
  user_metadata?: {
    display_name?: string | null
    department?: string | null
    avatar_url?: string | null
  } | null
} | null

type ProfileLike = {
  displayName?: string | null
  major?: string | null
  email?: string | null
  avatarUrl?: string | null
} | null

export function buildSessionUser(
  authUser: AuthUserLike,
  profile: ProfileLike,
  options?: { canAccessAdmin?: boolean },
): SessionUser | undefined {
  if (!authUser) {
    return undefined
  }

  const fallbackEmail = profile?.email ?? authUser.email ?? undefined

  return {
    name:
      profile?.displayName
      ?? authUser.user_metadata?.display_name
      ?? fallbackEmail
      ?? "Người dùng",
    subtitle:
      profile?.major
      ?? authUser.user_metadata?.department
      ?? fallbackEmail
      ?? undefined,
    avatarSrc:
      profile?.avatarUrl
      ?? authUser.user_metadata?.avatar_url
      ?? undefined,
    canAccessAdmin: options?.canAccessAdmin,
  }
}
