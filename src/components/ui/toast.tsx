"use client"

import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-xl border px-4 py-3 text-sm shadow-lg",
            t.variant === "destructive"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border/70 bg-card text-card-foreground"
          )}
        >
          {t.title && <p className="font-semibold">{t.title}</p>}
          {t.description && <p className="opacity-90">{t.description}</p>}
          {t.action && <div className="mt-1">{t.action}</div>}
        </div>
      ))}
    </div>
  )
}
