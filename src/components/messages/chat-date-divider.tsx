import { DividerLabel } from "@/components/shared/divider-label"
import { formatChatDateLabel, formatChatFullTime } from "@/utils/formatters"

interface ChatDateDividerProps {
  date: Date | string
}

export function ChatDateDivider({ date }: ChatDateDividerProps) {
  const label = formatChatDateLabel(date)
  const fullTime = formatChatFullTime(date)

  return (
    <div title={fullTime}>
      <DividerLabel label={label} />
    </div>
  )
}
