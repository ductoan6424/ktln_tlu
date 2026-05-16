# Global Conversation Bubbles Design

## Goal

Extend the existing message dropdown and floating chat experience so that:

1. the message popup shows all conversations, including direct chats and conversations attached to groups, clubs, and courses;
2. any conversation from that popup can open as a floating chat bubble;
3. floating chat bubbles are available across the whole `(main)` area of the app, not only on the feed page;
4. incoming messages for group, club, and course conversations can automatically open or focus the matching floating bubble.

This work is limited to authenticated main-app routes. It does not add floating chat support to `(auth)` pages or `admin` pages.

## Current State

- `listMyConversations()` already returns both direct and group conversations through `ChatConversationItem`.
- Community chat rooms for `GROUP`, `CLUB`, and `COURSE` are already persisted as group conversations with `communityType` and `communityTargetId`.
- `/messages` already renders group conversations correctly.
- `MessagePopup` removes every item without `peerUserId`, which excludes group and community conversations from the dropdown.
- `ChatPopup` is direct-chat specific. It is opened with an `ActiveFriend`, calls `openDirectConversation(friend.id)`, and derives its header from peer data.
- Floating chat orchestration exists in two places:
  - `TopNavbar` owns direct-chat bubbles for the global navbar experience.
  - `FeedPageClient` owns a second direct-chat bubble flow for feed-specific realtime behavior.

## Recommended Approach

Use a conversation-centered bubble model instead of extending the friend-centered popup in place.

The app already treats chat as a conversation domain on the server and on `/messages`. Moving the floating bubble layer to the same model keeps direct, group, club, and course chat on one path and avoids adding more direct-chat-only branches.

## Architecture

### Global Bubble Host

Add a client-side bubble host mounted from `src/app/(main)/layout.tsx`.

Responsibilities:

- own the list of open bubbles;
- open, focus, and close bubbles by `conversationId`;
- keep at most three bubbles open;
- subscribe to inbox realtime events for the authenticated main-area user;
- expose an `openConversation` callback to `TopNavbar` and other future `(main)` consumers.

The host is mounted once for all `(main)` pages, so moving between feed, clubs, groups, courses, profile, and settings preserves the same bubble system.

### Conversation Model

Introduce a client-facing bubble conversation shape derived from `ChatConversationItem`, for example:

- `id`
- `name`
- `avatarUrl`
- `isGroup`
- `peerUserId`
- `participantCount`
- `communityType`

Bubble identity is always `conversationId`, never a peer user id.

### Message Popup

`MessagePopup` should consume full `ChatConversationItem` records from `listMyConversations()` without filtering out items whose `peerUserId` is `null`.

Behavior:

- render direct and group rows through `ConversationItem`;
- pass `isGroup={conversation.isGroup}`;
- mark all loaded conversations as read when requested;
- emit `onOpenConversation(conversation)` when a row is clicked;
- close the dropdown after a row is selected.

### Floating Conversation Popup

Refactor the floating popup into a neutral conversation-based component.

Behavior:

- receive a conversation object, not an `ActiveFriend`;
- load messages directly from `getConversationMessages({ conversationId })`;
- send messages with `sendConversationMessage()`;
- show online state only for direct chats with `peerUserId`;
- show group header state for group and community conversations using `isGroup`, `name`, and `participantCount`;
- never call `openDirectConversation()` for an already-selected conversation.

### Realtime Inbox Flow

`chat.incoming` currently carries enough data to open a direct-chat bubble, but not enough to reconstruct a group or community bubble cleanly.

Extend the realtime payload published by `sendConversationMessage()` with conversation metadata:

- `conversationId`
- `conversationName`
- `conversationType`
- `peerUserId` for direct conversations when available
- `participantCount`
- `communityType`
- sender metadata already needed for previews

The global bubble host uses that payload to:

- open a new bubble if the conversation is not open;
- focus the existing bubble if it is already open;
- support direct and group/community conversations with the same path.

If a payload is unexpectedly incomplete, the host may refresh `listMyConversations()` to hydrate the conversation before opening it.

## Component Ownership Changes

### `TopNavbar`

- keeps the message icon and dropdown;
- no longer owns floating bubble state;
- passes selected conversations upward to the global host.

### `FeedPageClient`

- removes its local floating chat state and its local bubble rendering;
- stops running a second bubble system that duplicates navbar behavior.

### `(main)/layout.tsx`

- becomes the place where the global bubble host is mounted;
- provides the session user id required for inbox realtime subscription.

## UX Rules

- Clicking any conversation in the popup opens a floating bubble immediately.
- Incoming direct, group, club, and course messages may automatically open or focus a bubble anywhere inside `(main)`.
- At most three bubbles remain visible; opening a fourth evicts the least-recently-focused one.
- The popup keeps the existing unread badge and "view all messages" path.
- Community conversations use their own conversation names rather than a member fallback when available.

## Error Handling

- If a conversation becomes inaccessible after it was listed, the bubble should fail cleanly when loading messages and show a user-safe error state rather than silently creating a new conversation.
- If sending a message fails, optimistic UI should roll back exactly as the current direct bubble does.
- If realtime metadata is insufficient, the host should recover from the canonical conversation list instead of fabricating partial group data.

## Testing Strategy

Add focused regression tests for:

1. `MessagePopup` rendering both direct and group/community conversations.
2. Opening popup rows by `conversationId`, including rows with `peerUserId: null`.
3. The global bubble host deduplicating/focusing bubbles by `conversationId` and enforcing the three-bubble cap.
4. `sendConversationMessage()` publishing enriched `chat.incoming` payloads for direct and group conversations.
5. Main layout wiring the global host once for `(main)` routes.
6. Removal of feed-local bubble orchestration so there is only one global owner.

## Out of Scope

- Adding floating chat to admin or authentication routes.
- Redesigning the full `/messages` page.
- Changing community membership policy or chat permissions.
- Adding new conversation types beyond the existing direct and group model.

## Acceptance Criteria

- The message dropdown lists direct chats plus all conversations for groups, clubs, and courses that the user participates in.
- Clicking any listed conversation opens a working floating chat bubble.
- Floating bubbles remain available while navigating between all `(main)` pages.
- Incoming messages for group, club, and course conversations can automatically open or focus the correct bubble.
- The feed page no longer has a separate bubble implementation.
