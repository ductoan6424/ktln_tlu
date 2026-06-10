import { randomInt } from "crypto"

import type { UserRole } from "@prisma/client"

const INSTITUTIONAL_EMAIL_DOMAIN = "thanglong.edu.vn"

const ROLE_CODE_CONFIG = {
  STUDENT: { prefix: "SV", padding: 4 },
  LECTURER: { prefix: "GV", padding: 3 },
  ADMIN: { prefix: "AD", padding: 3 },
} as const satisfies Record<UserRole, { prefix: string; padding: number }>

const UPPERCASE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"
const LOWERCASE_CHARS = "abcdefghijkmnopqrstuvwxyz"
const NUMBER_CHARS = "23456789"
const SYMBOL_CHARS = "!@#$%^&*"
const PASSWORD_CHARS = `${UPPERCASE_CHARS}${LOWERCASE_CHARS}${NUMBER_CHARS}${SYMBOL_CHARS}`

export function getCodeConfigForRole(role: UserRole) {
  return ROLE_CODE_CONFIG[role]
}

function pickRandom(chars: string) {
  return chars[randomInt(chars.length)]!
}

function shuffle(chars: string[]) {
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    const current = chars[index]!
    chars[index] = chars[swapIndex]!
    chars[swapIndex] = current
  }
  return chars
}

export function formatSchoolIdentityCode(role: UserRole, number: number) {
  const config = getCodeConfigForRole(role)
  return `${config.prefix}${String(number).padStart(config.padding, "0")}`
}

export function buildInstitutionalEmail(code: string, domain = INSTITUTIONAL_EMAIL_DOMAIN) {
  return `${code.trim().toLowerCase()}@${domain.trim().toLowerCase()}`
}

export function generateInitialPassword() {
  const length = randomInt(14, 17)
  const chars = [
    pickRandom(UPPERCASE_CHARS),
    pickRandom(LOWERCASE_CHARS),
    pickRandom(NUMBER_CHARS),
    pickRandom(SYMBOL_CHARS),
  ]

  while (chars.length < length) {
    chars.push(pickRandom(PASSWORD_CHARS))
  }

  return shuffle(chars).join("")
}
