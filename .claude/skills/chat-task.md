# /chat-task - Work on Chat Implementation

Work on the next task from the chat implementation checklist.

## Usage
```
/chat-task [phase]
```

## Instructions

1. **Read the checklist**: `docs/CHAT-IMPLEMENTATION-CHECKLIST.md`

2. **Find next incomplete task**: Look for unchecked `- [ ]` items

3. **Implementation Order** (recommended):
   - Phase 1.1: Types (`lib/types/chat.js`)
   - Phase 1.2: Chat Service (`lib/firebase/chatService.js`)
   - Phase 1.3: Redux Slice (`lib/chatSlice.js`)
   - Phase 2: Hooks (`useChat`, `useChatList`)
   - Phase 4.1: Chat List Page
   - Phase 3: Components
   - Phase 4.2-4.3: Remaining Pages
   - Phase 5: Navigation Integration
   - Phase 6: Testing
   - Phase 8: Polish

4. **Key References**:
   - Spec document: `docs/CHAT-WEB-IMPLEMENTATION-SPEC.md`
   - Checklist: `docs/CHAT-IMPLEMENTATION-CHECKLIST.md`
   - Firebase setup: `firebase/firebase.js`
   - Existing user search: `lib/hooks/useUserSearch.js`
   - Auth context: `firebase/context/FirebaseContext.js`

5. **Important Patterns**:
   - Use JSDoc types, not TypeScript
   - Use CSS variables for styling
   - Use Redux (not Zustand) for global state
   - Route is `/chat`, not `/messages`
   - Images only for media (no video yet)
   - Paginate chat list to 50

6. **After completing a task**:
   - Mark the checkbox as complete: `- [x]`
   - Note any issues or follow-ups
   - Suggest the next task

## Chat-Specific Patterns

### Deterministic DM Chat ID (CRITICAL for mobile parity)
```javascript
export function getDmChatId(userId1, userId2) {
  return `dm_${[userId1, userId2].sort().join('_')}`;
}
```

### Chat Collections
- `/chats/{chatId}` - Chat metadata
- `/chats/{chatId}/messages/{messageId}` - Messages
- `/users/{userId}/chatSummaries/{chatId}` - Per-user chat list
- `chat-media/{chatId}/` - Storage for images

### Real-time Subscriptions
Always return unsubscribe function and clean up in useEffect.

Ask the user which phase or task they want to work on, or suggest the next logical task based on the checklist.
