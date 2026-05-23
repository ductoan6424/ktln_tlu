import { prisma } from "@/lib/prisma/client"

export type AccountGateStatus = "OK" | "INACTIVE" | "CONTACT_EMAIL_REQUIRED"

export async function getAccountGateStatus(userId: string): Promise<AccountGateStatus> {
  const [schoolIdentity, contactEmail] = await Promise.all([
    prisma.schoolIdentity.findUnique({
      where: { userId },
      select: { status: true },
    }),
    prisma.userContactEmail.findUnique({
      where: { userId },
      select: { verifiedAt: true },
    }),
  ])

  if (schoolIdentity?.status === "INACTIVE") {
    return "INACTIVE"
  }

  if (!contactEmail?.verifiedAt) {
    return "CONTACT_EMAIL_REQUIRED"
  }

  return "OK"
}
