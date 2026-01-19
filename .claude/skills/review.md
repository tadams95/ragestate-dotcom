# /review - Review Code for Pattern Compliance

Review code to ensure it follows RAGESTATE codebase patterns and conventions.

## Usage
```
/review [file_path]
```

## Instructions

When reviewing code, check for:

### 1. File Structure
- [ ] `'use client';` directive at top (for client components)
- [ ] Proper import organization (React, Next, Firebase, local)
- [ ] Using path aliases (`@lib/`, `@components/`, `@fb/`)
- [ ] `export default memo(ComponentName)` for components

### 2. Type Annotations
- [ ] Using JSDoc, NOT TypeScript
- [ ] `@typedef` for complex prop types
- [ ] `@param` and `@returns` for functions
- [ ] Descriptive comments for non-obvious logic

### 3. Styling
- [ ] Using CSS variables: `var(--bg-elev-1)`, `var(--text-primary)`, etc.
- [ ] NO hardcoded colors
- [ ] Tailwind classes for layout
- [ ] Supports dark mode automatically

### 4. State Management
- [ ] Using Redux hooks from `@lib/hooks` for global state
- [ ] Using `useState`/`useReducer` for local state
- [ ] NOT using Zustand

### 5. Firebase/Firestore
- [ ] Importing from `firebase/firestore` (modular SDK)
- [ ] Using `db` from `../../firebase/firebase`
- [ ] Handling Timestamp conversion (`.toDate()`)
- [ ] Returning unsubscribe from listeners
- [ ] Using `serverTimestamp()` for timestamps

### 6. Hooks
- [ ] Cleanup functions in useEffect
- [ ] `cancelled` flag for async operations
- [ ] `useCallback` for functions passed as props
- [ ] Proper dependency arrays

### 7. Error Handling
- [ ] Try/catch for async operations
- [ ] User-friendly error messages
- [ ] Console.error for debugging
- [ ] Loading and error states

### 8. Performance
- [ ] `memo()` wrapper for components
- [ ] `useCallback`/`useMemo` where appropriate
- [ ] Avoiding unnecessary re-renders
- [ ] Pagination for large lists

### 9. Accessibility
- [ ] `aria-label` for icon buttons
- [ ] Semantic HTML elements
- [ ] Keyboard navigation support
- [ ] Proper focus management

### 10. Security
- [ ] No sensitive data in client code
- [ ] Validating user input
- [ ] Using Firebase security rules (backend)
- [ ] No hardcoded API keys (use env vars)

## Output Format

Provide feedback as:

```
## Review: [filename]

### Issues Found
1. **[Category]**: Description of issue
   - Location: line X
   - Fix: How to fix it

### Suggestions
- Optional improvements that aren't bugs

### Good Practices Noticed
- Positive patterns worth keeping
```
