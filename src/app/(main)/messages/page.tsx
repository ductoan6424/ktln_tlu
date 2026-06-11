import type { Metadata } from "next"

import MessagesClient from "./messages-client"

export const metadata: Metadata = {
  title: "Tin nhắn",
  description: "Trò chuyện trực tiếp và nhắn tin nhóm với bạn bè trong cộng đồng.",
}

export default function MessagesPage() {
  return <MessagesClient />
}
