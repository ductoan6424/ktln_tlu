// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const changePassword = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => vi.fn())

vi.mock("@/actions/account-settings", () => ({
  changePassword,
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast }),
}))

import { ChangePasswordSection } from "@/app/(main)/settings/change-password-section"

describe("ChangePasswordSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("toggles visibility for each password field", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => root.render(createElement(ChangePasswordSection)))

    const currentPassword = container.querySelector("#current-password") as HTMLInputElement
    const newPassword = container.querySelector("#new-password") as HTMLInputElement
    const confirmPassword = container.querySelector("#confirm-new-password") as HTMLInputElement

    expect(currentPassword.type).toBe("password")
    expect(newPassword.type).toBe("password")
    expect(confirmPassword.type).toBe("password")

    await act(async () => {
      ;(container.querySelector('[aria-label="Hiện mật khẩu hiện tại"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[aria-label="Hiện mật khẩu mới"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[aria-label="Hiện xác nhận mật khẩu mới"]') as HTMLButtonElement).click()
    })

    expect(currentPassword.type).toBe("text")
    expect(newPassword.type).toBe("text")
    expect(confirmPassword.type).toBe("text")

    await act(async () => {
      ;(container.querySelector('[aria-label="Ẩn mật khẩu hiện tại"]') as HTMLButtonElement).click()
    })

    expect(currentPassword.type).toBe("password")
    expect(newPassword.type).toBe("text")
    expect(confirmPassword.type).toBe("text")
  })
})
