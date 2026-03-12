import { DividerLabel } from "@/components/shared/divider-label"

interface ChatDateDividerProps {
  label: string
}

export function ChatDateDivider({ label }: ChatDateDividerProps) {
  return <DividerLabel label={label} />
}
