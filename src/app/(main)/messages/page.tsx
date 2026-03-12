"use client"

import { ConversationList, ConversationListSkeleton } from "@/components/messages/conversation-list"
import { ConversationItem } from "@/components/messages/conversation-item"
import { ChatHeader, ChatHeaderSkeleton } from "@/components/messages/chat-header"
import { ChatBubble, ChatBubbleSkeleton } from "@/components/messages/chat-bubble"
import { ChatDateDivider } from "@/components/messages/chat-date-divider"
import { ChatAttachment } from "@/components/messages/chat-attachment"
import { MessageInput } from "@/components/messages/message-input"
import { TypingIndicator } from "@/components/messages/typing-indicator"
import { Skeleton } from "@/components/ui/skeleton"

const CONVERSATIONS = [
  {
    id: "1",
    name: "Trần Minh Thư",
    lastMessage: "Bạn xem đề cương bài tập lớn chưa?",
    time: "12:45",
    unreadCount: 2,
    status: "online" as const,
  },
  {
    id: "2",
    name: "Lê Văn Hùng",
    lastMessage: "Báo cáo thực hành đã nộp rồi.",
    time: "Hôm qua",
    status: "offline" as const,
  },
  {
    id: "3",
    name: "Nhóm NCKH AI",
    lastMessage: "File mới: bao_cao_v2.pdf",
    time: "2 ngày",
    isGroup: true,
  },
  {
    id: "4",
    name: "Phạm Quốc Anh",
    lastMessage: "Dời lịch họp sang 3h chiều nhé.",
    time: "T2",
    status: "away" as const,
  },
]

const ACTIVE_CHAT = {
  name: "Trần Minh Thư",
  role: "Trợ lý nghiên cứu",
  isOnline: true,
}

export default function MessagesPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Danh sách hội thoại */}
      <ConversationList>
        {CONVERSATIONS.map((conv) => (
          <ConversationItem
            key={conv.id}
            name={conv.name}
            lastMessage={conv.lastMessage}
            time={conv.time}
            unreadCount={conv.unreadCount}
            isActive={conv.id === "1"}
            status={conv.status}
            isGroup={conv.isGroup}
          />
        ))}
      </ConversationList>

      {/* Khung chat chính */}
      <section className="flex-1 flex flex-col bg-card relative">
        <ChatHeader
          name={ACTIVE_CHAT.name}
          role={ACTIVE_CHAT.role}
          isOnline={ACTIVE_CHAT.isOnline}
        />

        {/* Luồng tin nhắn */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
          <ChatDateDivider label="Hôm nay" />

          <ChatBubble
            senderName="Trần Minh Thư"
            message="Chào bạn! Mình đã hoàn thành bản nháp đầu tiên của bài báo tối ưu mạng nơ-ron. Bạn xem giúp mình khi rảnh nhé?"
            time="12:42"
            isOwn={false}
          />

          <ChatBubble
            message="Tuyệt vời luôn, Thư. Gửi file PDF qua đây đi, mình xem trước buổi seminar lúc 4h chiều."
            time="12:44"
            isOwn={true}
            readStatus="read"
          />

          {/* Tin nhắn có đính kèm */}
          <div className="flex flex-col gap-2 max-w-[80%]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">Trần Minh Thư</span>
              <span className="text-[10px] text-muted-foreground">12:45</span>
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-none p-3 space-y-3 shadow-sm">
              <p className="text-sm">Đây là file. Mình đã đánh dấu các thay đổi trong phần 3.2.</p>
              <ChatAttachment
                fileName="ToiUu_MangNoRon_v2.pdf"
                fileSize="2.4 MB"
                fileType="PDF"
              />
            </div>
          </div>

          <TypingIndicator userName="Trần Minh Thư" className="mt-4" />
        </div>

        {/* Ô nhập tin nhắn */}
        <MessageInput recipientName="Trần Minh Thư" />
      </section>
    </div>
  )
}

export function MessagesPageSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <ConversationListSkeleton />
      <section className="flex-1 flex flex-col bg-card">
        <ChatHeaderSkeleton />
        <div className="flex-1 p-6 space-y-6 flex flex-col">
          <Skeleton className="h-4 w-20 mx-auto" />
          <ChatBubbleSkeleton />
          <ChatBubbleSkeleton isOwn />
          <ChatBubbleSkeleton />
        </div>
      </section>
    </div>
  )
}
