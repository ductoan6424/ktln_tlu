import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

// ─── Cau hinh ─────────────────────────────────────────────────────────────────
// Nhan email + password tu argv hoac env (khong hardcode credential vao git).
//
// Cach 1: truyen qua argv
//   node scripts/reset-user-password.mjs <email> <newPassword>
//
// Cach 2: truyen qua env
//   $env:RESET_TARGET_EMAIL = "user@example.com"
//   $env:RESET_NEW_PASSWORD = "NewPassword@123"
//   node scripts/reset-user-password.mjs

const TARGET_EMAIL = (process.argv[2] ?? process.env.RESET_TARGET_EMAIL ?? "").trim()
const NEW_PASSWORD = process.argv[3] ?? process.env.RESET_NEW_PASSWORD ?? ""

// ─── Load env tu .env / .env.local ────────────────────────────────────────────
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex < 0) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    if (process.env[key] === undefined) {
      process.env[key] = rawValue.replace(/^["']|["']$/g, "")
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env"))
loadEnvFile(path.resolve(process.cwd(), ".env.local"))

// ─── Tim user theo email qua Supabase Admin API ───────────────────────────────
async function findUserByEmail(supabase, email) {
  const normalized = email.trim().toLowerCase()
  const perPage = 1000
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`Cannot list users: ${error.message}`)
    }

    const found = data.users.find((user) => user.email?.toLowerCase() === normalized)
    if (found) return found

    if (data.users.length < perPage) return null
    page += 1
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!TARGET_EMAIL || !NEW_PASSWORD) {
    console.error("Usage: node scripts/reset-user-password.mjs <email> <newPassword>")
    console.error("   or set RESET_TARGET_EMAIL and RESET_NEW_PASSWORD env vars")
    process.exitCode = 1
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env")
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  console.log(`Searching user with email: ${TARGET_EMAIL}`)
  const user = await findUserByEmail(supabase, TARGET_EMAIL)

  if (!user) {
    throw new Error(`User not found with email: ${TARGET_EMAIL}`)
  }

  console.log(`Found user id=${user.id}, updating password...`)
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: NEW_PASSWORD,
  })

  if (error) {
    throw new Error(`Cannot update password: ${error.message}`)
  }

  console.log("Password updated successfully")
  console.log(`  email: ${TARGET_EMAIL}`)
  console.log(`  user id: ${user.id}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
