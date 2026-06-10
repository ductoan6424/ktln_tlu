import { redirect } from "next/navigation"

import { CompleteContactEmailCard } from "@/app/(auth)/complete-contact-email/complete-contact-email-card"
import { prisma } from "@/lib/prisma/client"
import { createClient } from "@/lib/supabase/server"

export default async function CompleteContactEmailPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const contactEmail = await prisma.userContactEmail.findUnique({
    where: { userId: user.id },
    select: { verifiedAt: true },
  })

  if (contactEmail?.verifiedAt) redirect("/feed")

  return (
    <div className="flex w-full items-center justify-center">
      <div className="w-full max-w-md">
        <CompleteContactEmailCard />
      </div>
    </div>
  )
}
