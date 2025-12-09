# Instant Logout Header Fix

## Problem

After clicking **Log Out** on the Account page:

1. The profile picture remained visible in the Header.
2. The Header still showed authenticated UI (notifications bell, account link).
3. Full page reload was required to clear state.

## Root Cause

`logoutUser()` in `lib/utils/auth.js` called `localStorage.clear()` directly. The native `storage` event only fires **cross-tab** (not for the same tab that made the change), and no custom event was dispatched to notify the Header.

Additionally, the Header relied on `localStorage.get('idToken')` as a fallback even after Firebase `onAuthStateChanged` had already fired with `currentUser === null`.

## Solution

### 1. New `clearAuth()` method in `src/utils/storage.js`

```js
clearAuth() {
  for (const key of AUTH_KEYS) {
    this.remove(key);  // triggers AUTH_STORAGE_EVENT per key
  }
  // Also clear Redux persisted state
  window.localStorage.removeItem('authState');
  // Dispatch final "all cleared" event
  window.dispatchEvent(new CustomEvent(AUTH_STORAGE_EVENT, { detail: { key: 'all', value: null } }));
}
```

### 2. Updated `logoutUser()` in `lib/utils/auth.js`

```diff
-localStorage.clear();
+storage.clearAuth();
```

This ensures the Header's `AUTH_STORAGE_EVENT` listener fires immediately after logout.

### 3. React to Firebase `currentUser === null` in Header

Added a new effect in `src/app/components/Header.js`:

```js
useEffect(() => {
  if (!authLoading && currentUser === null && hydrated) {
    setProfilePicture('');
    setUserId('');
  }
}, [currentUser, authLoading, hydrated]);
```

This clears cached profile state the moment Firebase reports the user is signed out, providing an instant UI update **before** the storage event even arrives.

## Files Changed

| File                           | Change                                                        |
| ------------------------------ | ------------------------------------------------------------- |
| `src/utils/storage.js`         | Added `clearAuth()` method                                    |
| `lib/utils/auth.js`            | Import storage; use `storage.clearAuth()`                     |
| `src/app/components/Header.js` | Added effect to clear state when `currentUser` becomes `null` |

## Testing

1. Log in with a valid account.
2. Navigate to `/account`.
3. Click **Log Out**.
4. **Expected**: Header instantly hides profile picture, shows generic user icon, removes notification bell. No flash or stale state.
5. Refresh the page — state should remain logged out.

## Related

- `docs/HEADER_AUTH_FIX.md` — Login instant update fix (same event system).
