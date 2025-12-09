# Header & Login State Fix – December 08, 2025

## Root Cause Found

- [x] **Duplicate headers (server + client)** - The `Header` component was rendered BOTH in `layout.js` AND in 20+ individual pages (login, cart, account, shop, events, etc.). This caused a "double header" overlay effect where both headers rendered on top of each other.
- [x] **Auth state only checked via localStorage** - Header read from localStorage but the native `storage` event only fires for cross-tab changes, NOT same-tab changes. Login page wrote to localStorage but the Header never got notified in the same browser tab.
- [ ] Slow onAuthStateChanged listener (not applicable - was already in use via FirebaseContext)
- [x] **Hydration mismatch avoided** - The existing `hydrated` state pattern was correct but insufficient without fixing the other issues.
- [x] **Multiple state sources** - Auth state was fragmented across localStorage, Redux (authSlice, userSlice), and FirebaseContext. Header wasn't using the fastest source (Firebase).

## Fix Implemented

### Approach Used: Combination of A + B + C + D

1. **Custom Event System for Same-Tab Updates (Approach B/D)**
   - Updated `src/utils/storage.js` to dispatch a custom `auth-storage-change` event whenever auth-related keys are modified
   - This allows same-tab components to react instantly to localStorage changes

2. **Unified Auth Source with Firebase Context (Approach A)**
   - Updated `Header.js` to use `useAuth()` from `FirebaseContext` for immediate auth state
   - Firebase's `onAuthStateChanged` fires instantly on login/logout
   - Combined with localStorage persistence for faster initial load on refresh

3. **Removed Duplicate Headers**
   - Removed `<Header />` component from 20+ pages that were rendering it alongside the layout
   - Header is now only rendered once in `src/app/layout.js`

4. **Improved Skeleton Loading (Approach C)**
   - Added subtle pulse animation to the skeleton placeholder
   - Changed skeleton display logic: `showSkeleton = !hydrated || authLoading`

### Key Files Changed

| File                                         | Change                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/utils/storage.js`                       | Added `AUTH_STORAGE_EVENT` custom event dispatch for auth keys                                                           |
| `src/app/components/Header.js`               | Now uses `useAuth()` hook, listens for custom storage event, uses `isAuthenticated` derived from Firebase + localStorage |
| `src/app/login/page.js`                      | Uses `storage.set()` instead of `localStorage.setItem()` to trigger events; removed duplicate Header                     |
| `src/app/cart/page.js`                       | Removed duplicate Header                                                                                                 |
| `src/app/account/page.js`                    | Removed duplicate Header                                                                                                 |
| `src/app/shop/ShopClient.js`                 | Removed duplicate Header                                                                                                 |
| `src/app/create-account/page.js`             | Removed duplicate Header                                                                                                 |
| `src/app/feed/page.js`                       | Removed duplicate Header                                                                                                 |
| `src/app/feed/latest/page.js`                | Removed duplicate Header                                                                                                 |
| `src/app/events/[slug]/page.js`              | Removed duplicate Header                                                                                                 |
| `src/app/guestmix/page.js`                   | Removed duplicate Header                                                                                                 |
| `src/app/profile/ProfileView.js`             | Removed duplicate Header                                                                                                 |
| `src/app/profile/[userId]/page.js`           | Removed duplicate Header                                                                                                 |
| `src/app/admin/page.js`                      | Removed duplicate Header                                                                                                 |
| `src/app/blog/page.js`                       | Removed duplicate Header                                                                                                 |
| `src/app/blog/[slug]/page.js`                | Removed duplicate Header                                                                                                 |
| `src/app/forgot-password/page.js`            | Removed duplicate Header                                                                                                 |
| `src/app/not-found.js`                       | Removed duplicate Header                                                                                                 |
| `src/app/return-policy/page.js`              | Removed duplicate Header                                                                                                 |
| `src/app/privacy-policy/page.js`             | Removed duplicate Header                                                                                                 |
| `src/app/contact/page.js`                    | Removed duplicate Header                                                                                                 |
| `src/app/chat/page.js`                       | Removed duplicate Header                                                                                                 |
| `src/app/products/page.js`                   | Removed duplicate Header                                                                                                 |
| `src/app/shop/[slug]/ProductDetailClient.js` | Removed duplicate Header                                                                                                 |
| `src/app/post/[postId]/page.js`              | Removed duplicate Header                                                                                                 |
| `src/app/exchange/page.js`                   | Removed duplicate Header                                                                                                 |

### Before/After Behavior

**Before:**

- Login → Page navigates → Header still shows logged-out state → Eventual update after localStorage read
- Page refresh → Flash of wrong auth state → Header updates
- Double header overlay causing visual flicker

**After:**

- Login → `storage.set()` dispatches custom event → Header re-renders instantly
- Firebase `onAuthStateChanged` fires → Header updates immediately (even before localStorage)
- Single Header in layout → No overlay/double-render issues
- Page refresh → Skeleton shows briefly → Correct auth state loads from localStorage + Firebase

## Visual Test Results

| Scenario                              | Status              | Notes                                        |
| ------------------------------------- | ------------------- | -------------------------------------------- |
| Hard refresh (logged out → logged in) | ✅ Smooth           | Skeleton briefly visible, then auth UI       |
| Login from navbar                     | ✅ Instant update   | No flicker, profile icon appears immediately |
| Logout                                | ✅ Immediate change | Login icon appears instantly                 |
| Mobile menu                           | ✅ Consistent       | Same instant updates, no double menu         |
| Cross-tab sync                        | ✅ Works            | Native storage event still handles this      |
| Same-tab login                        | ✅ Fixed            | Custom event now notifies Header             |

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        layout.js                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   FirebaseProvider                       │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │              Header (single instance)            │    │    │
│  │  │                                                  │    │    │
│  │  │  useAuth() ──────► Firebase onAuthStateChanged   │    │    │
│  │  │       │                    │                     │    │    │
│  │  │       └──► isAuthenticated ◄──┘                  │    │    │
│  │  │                    │                             │    │    │
│  │  │  storage.readKeys() ◄── localStorage (fallback)  │    │    │
│  │  │                    │                             │    │    │
│  │  │  AUTH_STORAGE_EVENT ◄── storage.set() on login   │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │                    {children} (page content)            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Remaining Notes / Recommendations

1. **Consider migrating to `next-firebase-auth-edge`** if using middleware for server-side auth checks. Current fix is client-side only.

2. **Preload user avatar on login** - Currently the avatar URL is set in localStorage after login. Could preload the image for even faster perceived load:

   ```js
   // After setting profilePicture
   const img = new Image();
   img.src = profilePicture;
   ```

3. **Add skeleton shimmer** - The current skeleton is a static gray box. Consider adding a shimmer animation:

   ```css
   @keyframes shimmer {
     0% {
       background-position: -200% 0;
     }
     100% {
       background-position: 200% 0;
     }
   }
   ```

4. **Consolidate auth state** - Long-term, consider moving all auth state to a single source of truth (either Redux OR Context, not both). Current implementation works but has redundancy.

5. **Test with slow network** - Use Chrome DevTools throttling to verify the skeleton displays correctly during slow auth initialization.

## Files for Reference

- `src/utils/storage.js` - Storage helper with custom event dispatch
- `src/app/components/Header.js` - Updated header with unified auth
- `firebase/context/FirebaseContext.js` - Contains `useAuth()` hook
- `src/app/layout.js` - Single source of Header render
