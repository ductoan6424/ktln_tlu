"use client"

import { useCallback, useSyncExternalStore } from "react"

type ToastVariant = "default" | "destructive" | null

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

type ToastInput = Omit<Toast, "id">
type ToastListener = () => void

let toasts: Toast[] = []
const listeners = new Set<ToastListener>()

function emitToastChange() {
  listeners.forEach((listener) => listener())
}

export function subscribeToToastStore(listener: ToastListener) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function getToastSnapshot() {
  return toasts
}

export function addToast({ title, description, variant = "default" }: ToastInput) {
  const id = Math.random().toString(36).slice(2)

  toasts = [...toasts, { id, title, description, variant }]
  emitToastChange()

  setTimeout(() => {
    removeToast(id)
  }, 5000)

  return id
}

export function removeToast(id: string) {
  const nextToasts = toasts.filter((toast) => toast.id !== id)

  if (nextToasts.length === toasts.length) {
    return
  }

  toasts = nextToasts
  emitToastChange()
}

export function resetToastStore() {
  toasts = []
  listeners.clear()
}

export function useToast() {
  const sharedToasts = useSyncExternalStore(
    subscribeToToastStore,
    getToastSnapshot,
    getToastSnapshot
  )

  const toast = useCallback(
    (input: ToastInput) => {
      addToast(input)
    },
    []
  )

  return { toast, toasts: sharedToasts }
}
