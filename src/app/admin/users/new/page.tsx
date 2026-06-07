import { redirect } from "next/navigation"

export default function AdminNewUserPage() {
  redirect("/admin/users/import")
}
