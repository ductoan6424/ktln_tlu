// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const submitAssignmentForm = vi.hoisted(() => vi.fn())

vi.mock("@/actions/course-learning", () => ({
  submitAssignmentForm,
}))

import { CourseAssignmentSubmitForm } from "@/app/(main)/courses/[courseId]/course-assignment-submit-form"

describe("CourseAssignmentSubmitForm", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    root.unmount()
    document.body.innerHTML = ""
  })

  it("shows a local error and does not submit when the submission is empty", async () => {
    await act(async () => {
      root.render(createElement(CourseAssignmentSubmitForm, { assignmentId: "assignment-1" }))
    })

    const form = container.querySelector("form") as HTMLFormElement

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    })

    expect(submitAssignmentForm).not.toHaveBeenCalled()
    expect(container.textContent).toContain("Chưa nộp bài")
  })
})
