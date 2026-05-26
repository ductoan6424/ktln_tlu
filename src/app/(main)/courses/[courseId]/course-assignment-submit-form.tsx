"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"

import {
  submitAssignmentForm,
  type SubmitAssignmentFormState,
} from "@/actions/course-learning"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type CourseAssignmentSubmitFormProps = {
  assignmentId: string
}

const emptySubmissionMessage = "Chưa nộp bài. Vui lòng nhập nội dung hoặc chọn tệp."
const initialState: SubmitAssignmentFormState = { status: "idle", message: null }

function hasSelectedFile(formData: FormData) {
  return formData.getAll("attachments").some((entry) => entry instanceof File && entry.size > 0)
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Đang nộp..." : "Nộp bài"}
    </Button>
  )
}

export function CourseAssignmentSubmitForm({ assignmentId }: CourseAssignmentSubmitFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useActionState(submitAssignmentForm, initialState)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset()
    }
  }, [state.status])

  const message = localError ?? (state.status === "error" ? state.message : null)

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget)
        const content = String(formData.get("content") ?? "").trim()

        if (!content && !hasSelectedFile(formData)) {
          event.preventDefault()
          setLocalError(emptySubmissionMessage)
          return
        }

        setLocalError(null)
      }}
    >
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <Textarea name="content" placeholder="Ghi chú bài nộp" rows={3} />
      <Input name="attachments" type="file" multiple />
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      {!localError && state.status === "success" && state.message ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : null}
      <SubmitButton />
    </form>
  )
}
