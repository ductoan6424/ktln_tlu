import type { ChatMessageItem } from "@/types/chat"

function getMessageMutationKey(message: ChatMessageItem) {
  return message.clientMutationId ?? null
}

function findOptimisticIndex(
  messages: ChatMessageItem[],
  message: ChatMessageItem,
) {
  const mutationKey = getMessageMutationKey(message)
  if (!mutationKey) {
    return -1
  }

  return messages.findIndex((item) => {
    if (item.id === mutationKey) {
      return true
    }

    return item.clientMutationId === mutationKey && item.id.startsWith("temp-")
  })
}

export function createOptimisticMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `temp-${crypto.randomUUID()}`
  }

  return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function reconcileIncomingMessage(
  messages: ChatMessageItem[],
  incomingMessage: ChatMessageItem,
) {
  if (messages.some((item) => item.id === incomingMessage.id)) {
    return messages
  }

  const optimisticIndex = findOptimisticIndex(messages, incomingMessage)
  if (optimisticIndex === -1) {
    return [...messages, incomingMessage]
  }

  const nextMessages = messages.filter((item) => item.id !== incomingMessage.id)
  nextMessages[optimisticIndex] = incomingMessage
  return nextMessages
}

export function replaceOptimisticMessage(
  messages: ChatMessageItem[],
  optimisticId: string,
  confirmedMessage: ChatMessageItem,
) {
  const optimisticIndex = messages.findIndex((item) => {
    if (item.id === optimisticId) {
      return true
    }

    return (
      Boolean(confirmedMessage.clientMutationId) &&
      item.clientMutationId === confirmedMessage.clientMutationId &&
      item.id.startsWith("temp-")
    )
  })

  if (optimisticIndex !== -1) {
    const nextMessages = messages.filter((item) => item.id !== confirmedMessage.id)
    nextMessages[optimisticIndex] = confirmedMessage
    return nextMessages
  }

  if (messages.some((item) => item.id === confirmedMessage.id)) {
    return messages
  }

  return [...messages, confirmedMessage]
}
