import { redirect } from "next/navigation"

import { getAuthorizationContext } from "@/lib/auth/authorization"

import { NewClubForm } from "./new-club-form"

export const dynamic = "force-dynamic"

export default async function NewClubPage() {
  const context = await getAuthorizationContext()

  if (!context) {
    redirect("/login")
  }

  return <NewClubForm />
}
