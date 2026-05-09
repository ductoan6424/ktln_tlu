import { redirect } from "next/navigation"

import { getAuthorizationContext } from "@/lib/auth/authorization"

import { NewGroupForm } from "./new-group-form"

export const dynamic = "force-dynamic"

export default async function NewGroupPage() {
  const context = await getAuthorizationContext()

  if (!context) {
    redirect("/login")
  }

  return <NewGroupForm />
}
