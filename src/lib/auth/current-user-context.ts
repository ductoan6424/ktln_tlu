import { cache } from "react"
import type { UserRole } from "@prisma/client"
import type { User } from "@supabase/supabase-js"

import type { AccountGateStatus } from "@/lib/auth/account-gate"
import type { AnnouncementViewerContext } from "@/lib/announcements/targeting"
import { prisma } from "@/lib/prisma/client"
import { DEFAULT_USER_SETTINGS, type UserSettingsData } from "@/lib/settings/user-settings"
import { createClient } from "@/lib/supabase/server"

export type CurrentUserProfile = {
  userId: string
  email: string
  displayName: string
  avatarUrl: string | null
  major: string | null
  role: UserRole
  facultyId: string | null
  year: number | null
}

export type CurrentUserMemberships = {
  courseIds: string[]
  clubIds: string[]
  groupIds: string[]
}

export type CurrentUserContext = {
  authUser: User | null
  userId: string | null
  profile: CurrentUserProfile | null
  accountGateStatus: AccountGateStatus
  settings: UserSettingsData
  memberships: CurrentUserMemberships
  announcementViewerContext: AnnouncementViewerContext
}

function getAccountGateStatusFromRows(input: {
  schoolIdentity: { status: string } | null
  contactEmail: { verifiedAt: Date | null } | null
}): AccountGateStatus {
  if (input.schoolIdentity?.status === "INACTIVE") {
    return "INACTIVE"
  }

  if (!input.contactEmail?.verifiedAt) {
    return "CONTACT_EMAIL_REQUIRED"
  }

  return "OK"
}

function normalizeSettings(row: Partial<UserSettingsData> | null): UserSettingsData {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...(row ?? {}),
  }
}

export async function loadCurrentUserContext(): Promise<CurrentUserContext> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  const authUser = error ? null : user

  if (!authUser) {
    return {
      authUser: null,
      userId: null,
      profile: null,
      accountGateStatus: "OK",
      settings: DEFAULT_USER_SETTINGS,
      memberships: {
        courseIds: [],
        clubIds: [],
        groupIds: [],
      },
      announcementViewerContext: {
        userId: null,
        role: null,
        facultyId: null,
        year: null,
        courseIds: [],
        clubIds: [],
        groupIds: [],
      },
    }
  }

  const userId = authUser.id
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      userId: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      major: true,
      role: true,
      facultyId: true,
      year: true,
      deletedAt: true,
      schoolIdentity: {
        select: { status: true },
      },
      contactEmail: {
        select: { verifiedAt: true },
      },
      settings: true,
      courseMemberships: {
        select: { courseId: true },
      },
      ownedCourses: {
        where: { deletedAt: null },
        select: { id: true },
      },
      clubMemberships: {
        select: { clubId: true },
      },
      groupMemberships: {
        select: { groupId: true },
      },
    },
  })
  const normalizedProfile = profile && !profile.deletedAt
    ? {
        userId: profile.userId,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        major: profile.major,
        role: profile.role,
        facultyId: profile.facultyId,
        year: profile.year,
      }
    : null
  const memberships = {
    courseIds: Array.from(
      new Set([
        ...(profile?.courseMemberships ?? []).map((membership) => membership.courseId),
        ...(profile?.ownedCourses ?? []).map((course) => course.id),
      ]),
    ),
    clubIds: (profile?.clubMemberships ?? []).map((membership) => membership.clubId),
    groupIds: (profile?.groupMemberships ?? []).map((membership) => membership.groupId),
  }

  return {
    authUser,
    userId,
    profile: normalizedProfile,
    accountGateStatus: getAccountGateStatusFromRows({
      schoolIdentity: profile?.schoolIdentity ?? null,
      contactEmail: profile?.contactEmail ?? null,
    }),
    settings: normalizeSettings(profile?.settings ?? null),
    memberships,
    announcementViewerContext: {
      userId,
      role: normalizedProfile?.role ?? null,
      facultyId: normalizedProfile?.facultyId ?? null,
      year: normalizedProfile?.year ?? null,
      courseIds: memberships.courseIds,
      clubIds: memberships.clubIds,
      groupIds: memberships.groupIds,
    },
  }
}

export const getCurrentUserContext = cache(loadCurrentUserContext)
