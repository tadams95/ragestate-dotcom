# Mention Autocomplete - Web App Specification

## Overview

Add `@mention` autocomplete functionality to the Next.js 14 web app's PostComposer, allowing users to tag other users when creating posts. This follows the standard social media pattern (Twitter/X, Instagram, TikTok) and mirrors the mobile app implementation.

**Platform:** Next.js 14 (App Router)  
**Language:** JavaScript (JSX)  
**Related Mobile Spec:** `docs/MENTION-AUTOCOMPLETE-SPEC.md`  
**Design System:** `docs/social-ui-design-spec.md`

---

## Current Codebase Structure

### Existing Files (Reference)

| File                                 | Purpose                                        |
| ------------------------------------ | ---------------------------------------------- |
| `src/app/components/PostComposer.js` | Main post composer component (lines 157-755)   |
| `firebase/firebase.js`               | Firebase client init (`db`, `storage` exports) |
| `lib/hooks.js`                       | Existing custom hooks                          |
| `lib/features/userSlice.js`          | Redux user state                               |

### Key Integration Points in PostComposer.js

```javascript
// Line 160: Content state
const [content, setContent] = useState('');

// Lines 575-583: Current textarea (to be replaced)
<textarea
  className="rounded-lg... min-h-[120px] w-full resize-none"
  placeholder="What's happening?"
  value={content}
  onChange={(e) => setContent(e.target.value)}
  maxLength={2000}
  autoFocus
/>;
```

---

## User Experience Flow

### Happy Path

```
1. User opens post composer (modal or inline)
2. User types in the textarea: "Hey "
3. User types "@" → Autocomplete dropdown appears below cursor
4. User continues typing "@rage" → Results filter in real-time
5. Dropdown shows matching users:
   ┌─────────────────────────────────────┐
   │ [avatar] @ragestate  ✓  RAGESTATE  │
   │ [avatar] @rager_mike    Mike Johnson│
   │ [avatar] @rage_dj       DJ Rage     │
   └─────────────────────────────────────┘
6. User clicks row OR uses arrow keys + Enter to select
7. Input updates to: "Hey @ragestate "
8. Mention is highlighted in accent color
9. Dropdown dismisses
10. User continues typing and posts
```

### Keyboard Navigation

| Key       | Action                                      |
| --------- | ------------------------------------------- |
| `↓` / `↑` | Navigate through suggestions                |
| `Enter`   | Select highlighted suggestion               |
| `Escape`  | Dismiss dropdown, keep text                 |
| `Tab`     | Select first/highlighted suggestion         |
| `@`       | Trigger autocomplete (after space or start) |

### Edge Cases

| Scenario                                            | Behavior                                |
| --------------------------------------------------- | --------------------------------------- |
| No matches found                                    | Show "No users found" message           |
| Network error                                       | Show "Couldn't search users" with retry |
| User types `@` then deletes it                      | Dismiss dropdown                        |
| User types `@` mid-word (e.g., `test@user`)         | Don't trigger autocomplete              |
| User manually types valid mention without selecting | Still works (parsed when rendering)     |
| Multiple mentions in one post                       | Each `@` triggers fresh autocomplete    |
| User clicks outside dropdown                        | Dismiss dropdown, keep text             |
| Very long username list                             | Virtualize with max-height scroll       |

### Visual Design

```
┌─────────────────────────────────────────────────────────┐
│ ✕                     New Post                   [Post] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Hey @rage█                                             │
│       ┌─────────────────────────────────────────┐       │
│       │ [👤] @ragestate  ✓     RAGESTATE       │       │
│       │ [👤] @rager_mike       Mike Johnson    │       │
│       │ [👤] @rage_dj          DJ Rage         │       │
│       └─────────────────────────────────────────┘       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  490 characters remaining        [📷] [🎥]  🌐 Public  │
└─────────────────────────────────────────────────────────┘
```

- Dropdown appears **below** the cursor/caret position
- Max 5 results shown, scrollable if more
- Accent color (`--accent`) for verified badge and highlighted selection
- Avatar + username (semibold) + display name (secondary text)
- Focus ring on keyboard navigation

---

## Data Model

### Existing Firebase Collections (No Changes Required)

The mobile app already uses these collections. **No schema changes needed.**

#### `usernames` Collection

```javascript
// Document ID: lowercase username (e.g., "ragestate")
{
  uid: "abc123",           // User's Firebase UID
  username: "RageState",   // Original casing
  createdAt: Timestamp
}
```

#### `customers` Collection (for display info)

```javascript
// Document ID: Firebase UID
{
  displayName: "RAGESTATE",
  username: "ragestate",
  profilePicture: "https://...",
  verificationStatus: "verified" | "unverified",
  // ... other fields
}
```

### Search Query Strategy

Use the same Firestore prefix search as mobile:

```javascript
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/firebase';

async function searchUsersByUsername(searchTerm, maxResults = 10) {
  const usernamesRef = collection(db, 'usernames');
  const q = query(
    usernamesRef,
    where('__name__', '>=', searchTerm.toLowerCase()),
    where('__name__', '<=', searchTerm.toLowerCase() + '\uf8ff'),
    limit(maxResults),
  );

  const snapshot = await getDocs(q);
  // Then fetch user details from customers collection...
}
```

### JSDoc Types (for IDE support)

```javascript
/**
 * @typedef {Object} MentionUser
 * @property {string} uid - Firebase UID
 * @property {string} username - Username (lowercase)
 * @property {string} displayName - Display name
 * @property {string} [profilePicture] - Profile picture URL
 * @property {boolean} verified - Verification status
 */

/**
 * @typedef {Object} MentionState
 * @property {boolean} isOpen - Whether dropdown is visible
 * @property {string} query - Current search query (after @)
 * @property {number} startIndex - Position of @ in text
 * @property {number} selectedIndex - Currently highlighted result
 */
```

---

isOpen: boolean;
query: string;
startIndex: number;
selectedIndex: number;
}

```

---
## Components Needed

### File Structure (Actual Paths)

```

lib/
├── hooks/
│ ├── useMentionDetection.js # NEW - Phase 1
│ └── useUserSearch.js # NEW - Phase 2
├── firebase/
│ └── userSearch.js # NEW - Phase 2 (Firestore queries)
└── hooks.js # existing

src/app/components/
├── PostComposer.js # MODIFY - Phase 4
├── MentionAutocomplete.jsx # NEW - Phase 3
├── MentionUserRow.jsx # NEW - Phase 3
└── HighlightedTextarea.jsx # NEW - Phase 3

````

---

### 1. `MentionAutocomplete.jsx` (New)

**Location:** `src/app/components/MentionAutocomplete.jsx`

```javascript
/**
 * @param {Object} props
 * @param {string} props.query - Search query (text after @)
 * @param {boolean} props.isOpen - Whether dropdown is visible
 * @param {(user: MentionUser) => void} props.onSelect - Selection callback
 * @param {() => void} props.onClose - Close callback
 * @param {number} props.selectedIndex - Currently highlighted index
 * @param {(index: number) => void} props.onSelectedIndexChange - Update selection
 */
export default function MentionAutocomplete({ query, isOpen, onSelect, onClose, selectedIndex, onSelectedIndexChange }) {
  // ...
}
````

**Responsibilities:**

- Fetch matching users based on query (with debounce)
- Render dropdown with user list
- Handle mouse selection
- Handle keyboard navigation (arrow keys, enter, escape)
- Show loading/empty/error states
- Position below textarea (fixed position)

**Styling (Tailwind with CSS variables):**

```jsx
<div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow-lg">
  {/* User rows */}
</div>
```

---

### 2. `MentionUserRow.jsx` (New)

**Location:** `src/app/components/MentionUserRow.jsx`

```javascript
/**
 * @param {Object} props
 * @param {MentionUser} props.user
 * @param {boolean} props.isSelected
 * @param {() => void} props.onSelect
 * @param {() => void} props.onHover
 */
export default function MentionUserRow({ user, isSelected, onSelect, onHover }) {
  // ...
}
```

**Responsibilities:**

- Render single user row (avatar, username, verified badge, display name)
- Handle click
- Handle hover (for keyboard + mouse hybrid navigation)

---

### 3. `useMentionDetection.js` (New Hook)

**Location:** `lib/hooks/useMentionDetection.js`

```javascript
import { useState, useCallback, useRef } from 'react';

/**
 * Hook for detecting @ mentions in text input
 * @returns {Object} Mention detection state and handlers
 */
export function useMentionDetection() {
  const [mentionState, setMentionState] = useState({
    isOpen: false,
    query: '',
    startIndex: -1,
    selectedIndex: 0,
  });
  const textRef = useRef('');
  const cursorRef = useRef(0);

  // ... handlers

  return {
    mentionState,
    handleTextChange,
    insertMention,
    closeMention,
    navigateUp,
    navigateDown,
    setSelectedIndex,
  };
}
```

**Detection Logic:**

```javascript
function detectMention(text, cursorPos) {
  const beforeCursor = text.slice(0, cursorPos);
  const atIndex = beforeCursor.lastIndexOf('@');

  if (atIndex >= 0) {
    const charBefore = text[atIndex - 1];
    const isValidStart = atIndex === 0 || /\s/.test(charBefore);

    if (isValidStart) {
      const query = beforeCursor.slice(atIndex + 1);
      // Check query contains only valid username chars
      if (/^[a-zA-Z0-9_]*$/.test(query)) {
        return { isOpen: true, query, startIndex: atIndex };
      }
    }
  }

  return { isOpen: false, query: '', startIndex: -1 };
}
```

---

### 4. `useUserSearch.js` (New Hook)

**Location:** `lib/hooks/useUserSearch.js`

```javascript
import { useState, useCallback, useRef, useEffect } from 'react';
import { searchUsersByUsername } from '../firebase/userSearch';

/**
 * Hook for searching users with debounce and caching
 * @returns {Object} Search results and controls
 */
export function useUserSearch() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ... implementation

  return { results, isLoading, error, search, clear };
}
```

**Features:**

- Debounced search (300ms)
- In-memory caching (Map)
- Request cancellation for stale queries
- Error handling

---

### 5. `userSearch.js` (New - Firestore Queries)

**Location:** `lib/firebase/userSearch.js`

```javascript
import { collection, query, where, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

/**
 * Search users by username prefix
 * @param {string} searchTerm - Username prefix to search
 * @param {number} maxResults - Max results to return
 * @returns {Promise<MentionUser[]>}
 */
export async function searchUsersByUsername(searchTerm, maxResults = 10) {
  if (!searchTerm || searchTerm.length < 1) return [];

  const usernamesRef = collection(db, 'usernames');
  const q = query(
    usernamesRef,
    where('__name__', '>=', searchTerm.toLowerCase()),
    where('__name__', '<=', searchTerm.toLowerCase() + '\uf8ff'),
    limit(maxResults),
  );

  const snapshot = await getDocs(q);

  // Fetch user details from customers collection
  const users = await Promise.all(
    snapshot.docs.map(async (usernameDoc) => {
      const { uid, username } = usernameDoc.data();
      const customerDoc = await getDoc(doc(db, 'customers', uid));
      const customer = customerDoc.data() || {};

      return {
        uid,
        username: username || usernameDoc.id,
        displayName: customer.displayName || username || usernameDoc.id,
        profilePicture: customer.profilePicture || null,
        verified: customer.verificationStatus === 'verified',
      };
    }),
  );

  return users;
}
```

---

### 6. `HighlightedTextarea.jsx` (New)

**Location:** `src/app/components/HighlightedTextarea.jsx`

Since HTML `<textarea>` doesn't support rich text, use the **overlay technique**:

```jsx
import { forwardRef } from 'react';

/**
 * Textarea with mention highlighting overlay
 */
const HighlightedTextarea = forwardRef(function HighlightedTextarea(
  { value, confirmedMentions, onChange, onKeyDown, onSelect, className, ...props },
  ref,
) {
  return (
    <div className="relative">
      {/* Highlighted text overlay */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-3 text-transparent"
        aria-hidden="true"
      >
        {renderHighlightedText(value, confirmedMentions)}
      </div>

      {/* Actual textarea */}
      <textarea
        ref={ref}
        className={className}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onSelect={onSelect}
        {...props}
      />
    </div>
  );
});

function renderHighlightedText(text, confirmedMentions) {
  const parts = [];
  const mentionRegex = /@(\w+)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1].toLowerCase();
    const isConfirmed = confirmedMentions.has(username);

    // Text before mention
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex} className="text-[var(--text-primary)]">
          {text.slice(lastIndex, match.index)}
        </span>,
      );
    }

    // Mention (highlighted only if confirmed)
    parts.push(
      <span
        key={match.index}
        className={isConfirmed ? 'font-medium text-[#ff1f42]' : 'text-[var(--text-primary)]'}
      >
        {match[0]}
      </span>,
    );

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={lastIndex} className="text-[var(--text-primary)]">
        {text.slice(lastIndex)}
      </span>,
    );
  }

  return parts;
}

export default HighlightedTextarea;
```

---

## Implementation Phases

### Phase 1: Core Detection Logic ✅

**Files to create:**

- [x] `lib/hooks/useMentionDetection.js`

**Tasks:**

- [x] Create `useMentionDetection` hook
- [x] Implement `detectMention()` function
- [x] Implement `insertMention()` function
- [x] Test edge cases (mid-word @, multiple @, special chars)

---

### Phase 2: User Search Service ✅

**Files to create:**

- [x] `lib/firebase/userSearch.js`
- [x] `lib/hooks/useUserSearch.js`

**Tasks:**

- [x] Create `searchUsersByUsername()` Firestore query function
- [x] Create `useUserSearch` hook with debouncing (300ms)
- [x] Add request cancellation
- [x] Add result caching
- [ ] Test with existing usernames collection

---

### Phase 3: Autocomplete UI ✅

**Files to create:**

- [x] `src/app/components/MentionUserRow.jsx`
- [x] `src/app/components/MentionAutocomplete.jsx`
- [x] `src/app/components/HighlightedTextarea.jsx`

**Tasks:**

- [x] Create `MentionUserRow` component
- [x] Create `MentionAutocomplete` dropdown component
- [x] Create `HighlightedTextarea` with mention highlighting
- [x] Style with CSS variables from design system
- [x] Add loading/empty/error states
- [x] Add keyboard navigation (↑↓, Enter, Escape, Tab)
- [x] Add mouse hover/click selection

---

### Phase 4: PostComposer Integration ✅

**Files to modify:**

- [x] `src/app/components/PostComposer.js`

**Changes needed:**

1. **Add imports (after line 11):**

```javascript
import { useMentionDetection } from '../../../lib/hooks/useMentionDetection';
import MentionAutocomplete from './MentionAutocomplete';
import HighlightedTextarea from './HighlightedTextarea';
```

2. **Add state (after line 170):**

```javascript
const [confirmedMentions, setConfirmedMentions] = useState(new Set());
const textareaRef = useRef(null);

const {
  mentionState,
  handleTextChange: handleMentionChange,
  insertMention,
  closeMention,
  navigateUp,
  navigateDown,
  setSelectedIndex,
} = useMentionDetection();
```

3. **Add handlers (before onSubmit):**

```javascript
const handleContentChange = useCallback(
  (e) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(text);
    handleMentionChange(text, cursorPos);
  },
  [handleMentionChange],
);

const handleMentionSelect = useCallback(
  (user) => {
    const newContent = insertMention(content, user.username);
    setContent(newContent);
    setConfirmedMentions((prev) => new Set(prev).add(user.username.toLowerCase()));
    closeMention();
    textareaRef.current?.focus();
  },
  [content, insertMention, closeMention],
);

const handleKeyDown = useCallback(
  (e) => {
    if (!mentionState.isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateDown();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateUp();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeMention();
    }
  },
  [mentionState.isOpen, navigateDown, navigateUp, closeMention],
);
```

4. **Replace textarea (lines 575-583):**

```jsx
<div className="relative">
  <HighlightedTextarea
    ref={textareaRef}
    className="min-h-[120px] w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-colors duration-200 focus:border-[var(--border-strong)]"
    placeholder="What's happening?"
    value={content}
    confirmedMentions={confirmedMentions}
    onChange={handleContentChange}
    onKeyDown={handleKeyDown}
    onSelect={(e) => handleMentionChange(content, e.target.selectionStart)}
    maxLength={2000}
    autoFocus
  />

  {mentionState.isOpen && (
    <MentionAutocomplete
      query={mentionState.query}
      isOpen={mentionState.isOpen}
      onSelect={handleMentionSelect}
      onClose={closeMention}
      selectedIndex={mentionState.selectedIndex}
      onSelectedIndexChange={setSelectedIndex}
    />
  )}
</div>
```

---

### Phase 5: Polish & Edge Cases ✅

**Tasks:**

- [x] Add focus ring styling
- [x] Handle click outside to dismiss
- [x] Accessibility: ARIA attributes, screen reader announcements
- [x] Handle offline state gracefully
- [x] Performance optimization (memo)
- [ ] Test in all browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile web

---

## Accessibility Requirements

| Requirement                 | Implementation                                             |
| --------------------------- | ---------------------------------------------------------- |
| Keyboard navigation         | Arrow keys, Enter, Escape, Tab all functional              |
| Screen reader announcements | `aria-live="polite"` for results count                     |
| Focus management            | Return focus to textarea after selection                   |
| ARIA attributes             | `role="listbox"`, `aria-activedescendant`, `aria-expanded` |
| Color contrast              | Meet WCAG AA (4.5:1 for text)                              |
| Focus visible               | Clear focus ring on selected item                          |

```jsx
<div
  role="listbox"
  aria-label="User mention suggestions"
  aria-activedescendant={`mention-${selectedIndex}`}
>
  {users.map((user, index) => (
    <div
      key={user.uid}
      id={`mention-${index}`}
      role="option"
      aria-selected={index === selectedIndex}
    >
      ...
    </div>
  ))}
</div>;

{
  /* Screen reader announcement */
}
<div aria-live="polite" className="sr-only">
  {results.length} user{results.length !== 1 ? 's' : ''} found
</div>;
```

---

## Performance Considerations

| Concern                  | Mitigation                                       |
| ------------------------ | ------------------------------------------------ |
| Too many Firestore reads | Debounce 300ms, limit 10 results, cache          |
| Slow dropdown render     | Virtualize if >20 items (react-window)           |
| Keystroke lag            | Debounce search, keep UI responsive              |
| Memory usage             | Clear cache on unmount, limit cache size         |
| Bundle size              | Dynamic import MentionAutocomplete               |
| Network waterfalls       | Use React Query or SWR for caching/deduplication |

---

## Testing Checklist

### Unit Tests

- [ ] `useMentionDetection` - detects @ at various positions
- [ ] `useMentionDetection` - ignores @ in middle of words
- [ ] `useMentionDetection` - handles special characters
- [ ] `useUserSearch` - returns matching users
- [ ] `useUserSearch` - debounces rapid calls
- [ ] `useUserSearch` - cancels stale requests
- [ ] `insertMention` - correctly replaces text

### Integration Tests (Playwright/Cypress)

- [ ] Typing @ shows dropdown
- [ ] Arrow keys navigate options
- [ ] Enter selects highlighted option
- [ ] Escape dismisses dropdown
- [ ] Click on user selects them
- [ ] Multiple mentions in one post work
- [ ] Dropdown dismisses on blur

### Manual Testing

- [ ] Works in Chrome, Firefox, Safari
- [ ] Works on mobile browsers
- [ ] Works with screen readers (VoiceOver, NVDA)
- [ ] Works in both light and dark modes
- [ ] Works offline (shows error gracefully)

---

## Dependencies

**No new packages required** (recommended approach):

- Use native fetch/AbortController
- Use CSS for positioning
- Use React state for keyboard navigation

**Optional packages:**

- `textarea-caret` - Caret position detection
- `react-window` - Virtualization (if list gets long)
- `@tanstack/react-query` - Caching/deduplication (if not already using)

---

## Timeline Estimate

| Phase                    | Duration   |
| ------------------------ | ---------- |
| Phase 1: Detection Logic | 0.5 day    |
| Phase 2: Search Service  | 0.5 day    |
| Phase 3: UI Components   | 1 day      |
| Phase 4: Integration     | 0.5 day    |
| Phase 5: Polish          | 0.5 day    |
| **Total**                | **3 days** |

---

## Notes for Implementation

1. **Reuse Firestore logic** - The query pattern is identical to mobile. Consider sharing types if using a monorepo.

2. **Confirmed mentions tracking** - Only highlight mentions selected from autocomplete, not manually typed text.

3. **Focus management** - Critical for keyboard users. After selecting a mention, return focus to the textarea at the correct cursor position.

4. **Dropdown positioning** - Consider viewport boundaries. If dropdown would overflow bottom, position above the caret instead.

5. **Mobile web** - Test on mobile browsers. May need touch-specific handling for the dropdown.

6. **Dark/Light mode** - Use CSS variables (`var(--bg-elev-1)`, etc.) for automatic theme support.

---

## Reference: Mobile Implementation Files

For implementation reference, see these files in the mobile codebase:

| Mobile File                                   | Purpose                     |
| --------------------------------------------- | --------------------------- |
| `src/hooks/useMentionDetection.ts`            | Detection logic (port this) |
| `src/hooks/useUserSearch.ts`                  | Search hook (adapt for web) |
| `src/components/feed/MentionAutocomplete.tsx` | Dropdown UI (adapt for web) |
| `src/components/feed/MentionUserRow.tsx`      | User row (adapt for web)    |
| `src/services/userSearchService.ts`           | Firestore queries (reuse)   |
| `src/components/feed/PostComposer.tsx`        | Integration example         |

---

## Sign-off

- [ ] Product review
- [ ] Design review
- [ ] Engineering review
- [ ] Ready for implementation
