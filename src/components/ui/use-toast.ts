"use client"

import { useState, useCallback } from "react"

type ToastVariant = "default" | "destructive" | null

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(
    ({ title, description, variant = "default" }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { id, title, description, variant }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
    },
    []
  )

  return { toast, toasts }
}
