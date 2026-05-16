# Global Conversation Bubbles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the floating chat experience conversation-based so direct chats plus group, club, and course chats can open from the message popup anywhere in `(main)`.

**Architecture:** Keep `listMyConversations()` as the canonical source of chat metadata, move floating bubble ownership into a single client host mounted from `(main)/layout.tsx`, and refactor the bubble UI to open by `conversationId` instead of peer user id. Enrich inbox realtime events so direct and group/community messages can hydrate the same bubble model.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma, Ably, Vitest.

---

## File Map

- Create `src/components/layout/chat-dock.tsx`
  - Global client owner for open floating conversations, inbox-triggered opening, and a `useChatDock()` context API for `(main)` descendants.
- Create `tests/components/message-popup.test.ts`
  - Regression coverage for direct plus group rows in the popup.
- Create `tests/components/chat-dock.test.ts`
  - Regression coverage for bubble dedupe, focus ordering, and 3-bubble cap.
- Modify `src/types/chat.ts`
  - Add a reusable conversation shape for floating bubbles and enrich inbox notification typing.
- Modify `src/actions/chat.ts`
  - Publish richer `chat.incoming` payloads with conversation metadata.
- Modify `tests/actions/chat.test.ts`
  - Assert new direct and group inbox payload behavior.
- Modify `src/hooks/use-inbox-notification.ts`
  - Consume the richer inbox payload type.
- Modify `src/components/layout/message-popup.tsx`
  - Stop filtering out groups and emit selected conversations instead of friends.
- Modify `src/components/layout/chat-popup.tsx`
  - Refactor from direct-friend popup to generic conversation popup.
- Modify `src/components/layout/top-navbar.tsx`
  - Delegate bubble opening to the global host instead of owning popup state.
- Modify `src/app/(main)/layout.tsx`
  - Mount the dock once across all main routes.
- Modify `src/app/(main)/feed/feed-page-client.tsx`
  - Replace feed-local floating popup ownership with calls into the shared dock while preserving `ActiveFriends` direct-chat opening.
- Create `tests/layout/main-layout-chat-dock.test.ts`
  - Verify the main layout wires the global dock once.

## Task 1: Define conversation-based chat types and realtime payload

**Files:**
- Modify: `src/types/chat.ts`
- Modify: `src/hooks/use-inbox-notification.ts`
- Modify: `tests/actions/chat.test.ts`
- Modify: `src/actions/chat.ts`

- [ ] **Step 1: Write the failing tests for enriched inbox events**

Add expectations in `tests/actions/chat.test.ts` proving direct and group sends publish `chat.incoming` metadata:

```ts
expect(publish).toHaveBeenCalledWith(
  "chat.incoming",
  expect.objectContaining({
    conversationId: "conv-1",
    conversationName: null,
    conversationType: "DIRECT",
    peerUserId: "user-self",
    participantCount: 2,
    communityType: null,
    senderId: "user-self",
  }),
)
```

Add a second group case:

```ts
it("publishes group metadata for inbox recipients", async () => {
  // mock a GROUP conversation named "Python Group" with 3 participants
  // send a message
  expect(publish).toHaveBeenCalledWith(
    "chat.incoming",
    expect.objectContaining({
      conversationId: "conv-group",
      conversationName: "Python Group",
      conversationType: "GROUP",
      peerUserId: null,
      participantCount: 3,
      communityType: "GROUP",
    }),
  )
})
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```powershell
npx vitest run tests/actions/chat.test.ts
```

Expected: fail because `chat.incoming` does not yet include the new conversation metadata.

- [ ] **Step 3: Add the shared types**

Extend `src/types/chat.ts` with:

```ts
export type ChatConversationBubble = Pick<
  ChatConversationItem,
  "id" | "name" | "avatarUrl" | "isGroup" | "peerUserId" | "participantCount" | "communityType"
>

export type ChatInboxNotification = {
  conversationId: string
  conversationName: string | null
  conversationType: "DIRECT" | "GROUP"
  peerUserId: string | null
  participantCount: number
  communityType: CommunityType | null
  senderId: string
  senderName: string
  senderAvatarUrl: string | null
  content: string
}
```

Update `src/hooks/use-inbox-notification.ts` to import and re-export `ChatInboxNotification` rather than defining a narrower local type.

- [ ] **Step 4: Publish enriched inbox metadata**

In `sendConversationMessage()`:

1. expand `deliveryInfo` selection to include `communityType`;
2. derive `participantCount`;
3. publish:

```ts
{
  conversationId: input.conversationId,
  conversationName: deliveryInfo?.name ?? null,
  conversationType: deliveryInfo?.type ?? "DIRECT",
  peerUserId:
    deliveryInfo?.type === "DIRECT"
      ? currentUser.userId
      : null,
  participantCount: deliveryInfo?.participants.length ?? 0,
  communityType: deliveryInfo?.communityType ?? null,
  senderId: currentUser.userId,
  senderName: currentUser.displayName,
  senderAvatarUrl: currentUser.avatarUrl,
  content: finalContent,
}
```

`peerUserId` is the id the recipient should use to identify the direct counterpart in their UI, so for a recipient it is the sender id.

- [ ] **Step 5: Run the focused tests and verify green**

Run:

```powershell
npx vitest run tests/actions/chat.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add src/types/chat.ts src/hooks/use-inbox-notification.ts src/actions/chat.ts tests/actions/chat.test.ts
git commit -m "feat: enrich chat inbox payloads"
```

## Task 2: Show every conversation in the message popup

**Files:**
- Create: `tests/components/message-popup.test.ts`
- Modify: `src/components/layout/message-popup.tsx`

- [ ] **Step 1: Write the failing popup tests**

Create `tests/components/message-popup.test.ts` with mocked actions and a minimal render proving group rows survive:

```ts
it("renders direct and group conversations from the popup data source", async () => {
  listMyConversations.mockResolvedValue({
    success: true,
    data: [
      {
        id: "direct-1",
        name: "Lan",
        peerUserId: "user-lan",
        avatarUrl: null,
        isGroup: false,
        communityType: null,
        isOnline: false,
        participantCount: 2,
        unreadCount: 0,
        lastMessage: "Xin chao",
        lastMessageAt: "1 phut truoc",
      },
      {
        id: "group-1",
        name: "Python Group",
        peerUserId: null,
        avatarUrl: null,
        isGroup: true,
        communityType: "GROUP",
        isOnline: false,
        participantCount: 12,
        unreadCount: 2,
        lastMessage: "Thong bao moi",
        lastMessageAt: "vua xong",
      },
    ],
  })

  // render, open dropdown, wait for results
  expect(screen.getByText("Lan")).toBeInTheDocument()
  expect(screen.getByText("Python Group")).toBeInTheDocument()
})
```

Add a click test that captures `onOpenConversation` and verifies it receives the `group-1` item even when `peerUserId` is `null`.

- [ ] **Step 2: Run the popup tests and verify red**

Run:

```powershell
npx vitest run tests/components/message-popup.test.ts
```

Expected: fail because group conversations are filtered out and the component still exposes `onOpenChat(friend)`.

- [ ] **Step 3: Refactor `MessagePopup` to be conversation-based**

Change the public contract to:

```ts
interface MessagePopupProps {
  onOpenConversation?: (conversation: ChatConversationBubble) => void
  className?: string
}
```

Store `ChatConversationItem[]` directly, remove the `peerUserId` filter, render `isGroup={conversation.isGroup}`, and invoke:

```ts
onOpenConversation?.({
  id: conversation.id,
  name: conversation.name,
  avatarUrl: conversation.avatarUrl,
  isGroup: conversation.isGroup,
  peerUserId: conversation.peerUserId,
  participantCount: conversation.participantCount,
  communityType: conversation.communityType ?? null,
})
```

- [ ] **Step 4: Run the popup tests and verify green**

Run:

```powershell
npx vitest run tests/components/message-popup.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add src/components/layout/message-popup.tsx tests/components/message-popup.test.ts
git commit -m "feat: show group conversations in message popup"
```

## Task 3: Refactor the floating popup around conversations

**Files:**
- Modify: `src/components/layout/chat-popup.tsx`
- Add or extend tests near: `tests/components/chat-dock.test.ts`

- [ ] **Step 1: Write a failing unit test for bubble-friendly conversation rendering**

In `tests/components/chat-dock.test.ts`, mock the popup child and assert the host passes through conversation ids rather than peer ids. The test should exercise a group conversation:

```ts
const groupConversation = {
  id: "conv-group",
  name: "Python Group",
  avatarUrl: null,
  isGroup: true,
  peerUserId: null,
  participantCount: 12,
  communityType: "GROUP",
}
```

Expected render marker:

```ts
expect(screen.getByTestId("chat-popup-conv-group")).toBeInTheDocument()
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```powershell
npx vitest run tests/components/chat-dock.test.ts
```

Expected: fail because no conversation-based host or popup exists yet.

- [ ] **Step 3: Refactor `chat-popup.tsx`**

Change the prop surface from:

```ts
friend: ActiveFriend
```

to:

```ts
conversation: ChatConversationBubble
```

Replace all direct-only initialization with direct conversation loading:

```ts
setConversationId(conversation.id)
const messagesResult = await getConversationMessages({
  conversationId: conversation.id,
})
```

Use:

```ts
const isOnline = useMemo(
  () => Boolean(conversation.peerUserId && onlineUserIds.has(conversation.peerUserId)),
  [conversation.peerUserId, onlineUserIds],
)
```

Header behavior:

```tsx
<ChatHeader
  name={conversation.name}
  avatarSrc={conversation.avatarUrl ?? undefined}
  isOnline={isOnline}
  isGroup={conversation.isGroup}
  participantCount={conversation.participantCount}
  compact
  showClose
  onClose={onClose}
/>
```

When notifying sent-message contact changes:

- direct chats call `notifyContactMessageChanged` only when `conversation.peerUserId` exists;
- group chats call `notifyContactGroupChanged({ action: "message-sent", conversationId })`.

- [ ] **Step 4: Run the focused tests and verify green**

Run:

```powershell
npx vitest run tests/components/chat-dock.test.ts tests/actions/chat.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add src/components/layout/chat-popup.tsx tests/components/chat-dock.test.ts
git commit -m "refactor: make floating chat conversation-based"
```

## Task 4: Add the global dock and wire it into `(main)`

**Files:**
- Create: `src/components/layout/chat-dock.tsx`
- Modify: `src/components/layout/top-navbar.tsx`
- Modify: `src/app/(main)/layout.tsx`
- Create: `tests/layout/main-layout-chat-dock.test.ts`
- Extend: `tests/components/chat-dock.test.ts`

- [ ] **Step 1: Write failing dock behavior tests**

Cover:

```ts
it("deduplicates by conversation id and focuses an existing bubble", () => {
  // open A, open B, open A again
  // expect render order A then B
})

it("keeps at most three open conversations", () => {
  // open A, B, C, D
  // expect D, C, B and A removed
})
```

Also add a layout-level test proving `ChatDock` is rendered from `(main)/layout.tsx`.

- [ ] **Step 2: Run the focused tests and verify red**

Run:

```powershell
npx vitest run tests/components/chat-dock.test.ts tests/layout/main-layout-chat-dock.test.ts
```

Expected: fail because the dock and layout wiring do not exist.

- [ ] **Step 3: Implement `ChatDock`**

Create a client component that:

- stores `ChatConversationBubble[]`;
- exposes `openConversation`, `closeConversation`, `focusConversation`;
- exports `useChatDock()` from a React context;
- subscribes with `useInboxNotification({ userId, onIncoming })`;
- converts incoming payloads into `ChatConversationBubble`;
- opens/focuses by `conversationId`;
- trims state with `slice(0, 3)`;
- renders `ChatPopup` children.

Core update helper:

```ts
function prioritizeConversation(
  current: ChatConversationBubble[],
  nextConversation: ChatConversationBubble,
) {
  const withoutExisting = current.filter((item) => item.id !== nextConversation.id)
  return [nextConversation, ...withoutExisting].slice(0, 3)
}
```

Convert inbox payloads with direct-chat fallbacks:

```ts
function notificationToConversation(notification: ChatInboxNotification): ChatConversationBubble {
  return {
    id: notification.conversationId,
    name:
      notification.conversationType === "DIRECT"
        ? notification.senderName
        : notification.conversationName ?? "Nhóm chat",
    avatarUrl:
      notification.conversationType === "DIRECT"
        ? notification.senderAvatarUrl
        : null,
    isGroup: notification.conversationType === "GROUP",
    peerUserId: notification.peerUserId,
    participantCount: notification.participantCount,
    communityType: notification.communityType,
  }
}
```

- [ ] **Step 4: Wire the dock into layout and navbar**

In `(main)/layout.tsx`, wrap `TopNavbar`, `main`, and `MobileBottomNav` with `ChatDock`.

In `TopNavbar`:

- remove `openPopups` local state;
- remove `useInboxNotification`;
- call `const { openConversation } = useChatDock()`;
- pass `openConversation` to `MessagePopup`.

- [ ] **Step 5: Run the focused tests and verify green**

Run:

```powershell
npx vitest run tests/components/chat-dock.test.ts tests/layout/main-layout-chat-dock.test.ts tests/components/message-popup.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add src/components/layout/chat-dock.tsx src/components/layout/top-navbar.tsx 'src/app/(main)/layout.tsx' tests/components/chat-dock.test.ts tests/layout/main-layout-chat-dock.test.ts
git commit -m "feat: add global chat dock"
```

## Task 5: Move feed bubble triggers onto the global dock

**Files:**
- Modify: `src/app/(main)/feed/feed-page-client.tsx`
- Create: `tests/components/feed-page-chat-dock.test.ts`

- [ ] **Step 1: Write a failing source-level regression test**

Create `tests/components/feed-page-chat-dock.test.ts` so it asserts the feed page no longer owns its own popup state but still opens chats through the dock:

```ts
expect(source).not.toContain('import { ChatPopup } from "@/components/layout/chat-popup"')
expect(source).not.toContain("const [openPopups")
expect(source).not.toContain("setupIncomingListeners")
expect(source).toContain("useChatDock")
expect(source).toContain("openDirectConversation")
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```powershell
npx vitest run tests/components/feed-page-chat-dock.test.ts
```

Expected: fail because the feed page still owns popup state.

- [ ] **Step 3: Remove the duplicate flow**

Delete from `feed-page-client.tsx`:

- `ChatPopup` import;
- `listMyConversations`, `createAblyClient`, `getChatChannelName`, and `ChatMessageItem` imports used only by the local inbox flow;
- local `openPopups` state and helpers;
- local Ably effect that opens direct bubbles;
- local rendering of `<ChatPopup />`.

Keep `ActiveFriends` working by:

```ts
const { openConversation } = useChatDock()

const openChat = useCallback(async (friend: ActiveFriend) => {
  const result = await openDirectConversation(friend.id)
  if (!result.success || !result.data) {
    return
  }

  openConversation({
    id: result.data.conversationId,
    name: result.data.peer.displayName,
    avatarUrl: result.data.peer.avatarUrl,
    isGroup: false,
    peerUserId: result.data.peer.userId,
    participantCount: 2,
    communityType: null,
  })
}, [openConversation])
```

Keep unrelated feed functionality untouched.

- [ ] **Step 4: Run the focused test and verify green**

Run:

```powershell
npx vitest run tests/components/feed-page-chat-dock.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add 'src/app/(main)/feed/feed-page-client.tsx' tests/components/feed-page-chat-dock.test.ts
git commit -m "refactor: remove feed-local chat bubbles"
```

## Task 6: Full verification

**Files:**
- No new files.

- [ ] **Step 1: Run the relevant test suite**

```powershell
npx vitest run tests/actions/chat.test.ts tests/components/message-popup.test.ts tests/components/chat-dock.test.ts tests/layout/main-layout-chat-dock.test.ts tests/components/feed-page-chat-dock.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run broader project verification**

```powershell
npx vitest run
npm run lint
npm run build
```

Expected: all commands exit successfully.

- [ ] **Step 3: Manual sanity pass**

Run the dev server:

```powershell
npm run dev
```

Verify in the browser:

1. Open the message icon from a non-feed `(main)` page.
2. Confirm direct, group, club, and course conversations appear.
3. Click a group/community conversation and confirm a floating bubble opens.
4. Navigate to another `(main)` page and confirm the bubble system remains available.
5. Send or receive a group/community message and confirm the matching bubble opens or focuses.

- [ ] **Step 4: Final commit if any verification fixes were needed**

```powershell
git add .
git commit -m "test: verify global conversation bubbles"
```

## Self-Review

- Spec coverage:
  - popup shows group/community conversations: Task 2
  - conversation-based bubbles: Task 3
  - global availability across `(main)`: Task 4
  - incoming group/community messages auto-open bubbles: Tasks 1 and 4
  - feed-local duplication removed: Task 5
  - verification and acceptance coverage: Task 6
- Placeholder scan:
  - no `TODO`, `TBD`, or vague "handle errors later" items remain.
- Type consistency:
  - `ChatConversationBubble` and `ChatInboxNotification` are defined once in Task 1 and reused consistently by later tasks.
