## RAGESTATE Performance Enhancements

This document captures a focused performance review of the codebase and a prioritized action plan with simple, efficient fixes first. Each item lists where it appears, why it matters, and concrete next steps.

### Goals

- Improve Core Web Vitals (LCP, CLS, INP) on landing and high-traffic pages
- Reduce CPU/GPU workload and battery drain on mobile
- Lower data transfer and client-side work by querying efficiently
- Standardize image delivery and caching for consistently fast loads

---

## P0: Home page WebGL load (two canvases mounted)

• Where

- `src/app/page.js`: two overlapping 3D backgrounds (`<Home3DAnimation />`) toggled by opacity, both mounted and rendering continuously.
- `src/app/components/animations/home-3d-animation.js`: 2,000 particles updating every frame.

• Why it matters

- Two `<Canvas>` render loops double the GPU/CPU load on your landing page, hurting TTI/INP, battery, and smoothness—especially on mid/low-end devices.

• Quick wins (low risk)

- Render only one `<Canvas>` at a time (conditional render instead of opacity toggle). Keep a single instance and switch color/intensity via state.
- Cap device pixel ratio and reduce AA for the scene: `<Canvas dpr={[1, 1.5]} gl={{ powerPreference: 'low-power', antialias: false }} />`.
- Lazy-mount 3D when the hero section is in view (Intersection Observer or `inView`) and unmount when fully out of view (no hidden background burning cycles).
- Reduce particle count on mobile (e.g., 600–1000) via a simple `isMobile`/`matchMedia('(max-width: 768px)')` check.

• Better (medium effort)

- Use a single `<Canvas>` and morph attributes (color/intensity) instead of swapping canvases.
- Consider `frameloop="demand"` with an internal throttled invalidation (e.g., update every 2–3 frames) to reduce continuous work.
- Respect `prefers-reduced-motion` to disable or simplify 3D for users who prefer it.

• Validation

- Profile CPU/GPU with Chrome Performance on the home page before/after; watch INP and responsiveness while scrolling.

---

## P0: Firestore queries on Events (client-side filter/sort)

• Where

- `src/app/events/page.js`: `getDocs(collection(db, 'events'))` then filter client-side for upcoming events and sort in JS.

• Why it matters

- Pulling the entire collection increases payload, JS work, and time-to-content. Doing this on the client delays render and blocks the main thread.

• Quick wins (low risk)

- Use Firestore queries: `query(collection(db, 'events'), where('dateTime', '>=', Timestamp.now()), orderBy('dateTime', 'asc'), limit(n))` to fetch only upcoming events, already sorted.
- Add a small `limit(12–24)` to cut over-fetching.

• Better (medium effort)

- Move fetching server-side (Next.js Route Handler/API or server component using Admin SDK), enable HTTP caching (`Cache-Control`) and incremental revalidation.
- Shape the response to the exact fields needed by the UI.

• Validation

- Compare network payload and first contentful render time before/after; check the Events page skeleton duration.

---

## P0: TicketsTab N+1 Firestore reads

• Where

- `src/app/account/components/TicketsTab.js`: loads all events, then for each event queries the `ragers` subcollection for the user (N+1 pattern).

• Why it matters

- This scales poorly with number of events (latency and billable reads), slowing account loads and spiking costs.

• Quick wins (low/medium risk)

- Use a collection group query on `ragers`:
  - `query(collectionGroup(db, 'ragers'), where('firebaseId','==', userId), where('active','==', true))` to fetch all user tickets in one query.
  - If event metadata is needed, either denormalize a subset into the rager doc (eventName, date, imageUrl), or batch-fetch the small set of parent events by ID (`where(documentId(), 'in', [...])` in chunks of 10).

• Better (medium effort)

- Backfill/maintain denormalized event fields in rager docs on write via Cloud Functions so the UI can render without extra joins.

• Validation

- Measure total read count and time-to-list tickets before/after; expect a big drop in queries and latency.

---

## P1: Image delivery standardization (Next/Image)

• Where

- Raw `<img>` usage in multiple places: `src/app/components/Header.js` (logo), product/blog/account tiles, admin modals, etc.
- Remote images come from `cdn.shopify.com`, `firebasestorage.googleapis.com`, and `images.unsplash.com` (already whitelisted in `next.config.mjs`).

• Why it matters

- Missing Next/Image forfeits responsive sizes, lazy loading, decoding, and optimized formats—hurting LCP and bandwidth.

• Quick wins (low risk)

- Migrate high-traffic above-the-fold images first:
  - Header logo to `<Image priority sizes="(min-width: 1024px) 120px, 80px" />` with fixed dimensions to prevent CLS.
  - Product listings and hero images to `<Image>` with appropriate `sizes` and `placeholder="blur"` for known assets.
- Ensure each `<Image>` has width/height or `fill` plus CSS to eliminate layout shift.

• Better (medium effort)

- Introduce a small helper component that wraps `<Image>` with sensible defaults (sizes, quality, priority heuristics) to standardize usage.

• Validation

- Lighthouse and Web Vitals (LCP/CLS) improvements on home, shop, and events pages.

---

## P1: Shop banner GIFs and heavy media

• Where

- `src/app/shopbanner/page.js`: full-screen rotating GIFs.

• Why it matters

- GIFs are large and inefficient compared to MP4/WebM or animated WebP—affecting bandwidth and CPU.

• Quick wins (low risk)

- Convert GIFs to MP4/WebM and render via `<video>` with `playsInline autoPlay muted loop` and a poster image.
- Or convert to animated WebP where acceptable; fall back as needed.

• Validation

- Network panel size and decode time drop significantly; smoother transitions.

---

## P1: Framer Motion scope and reduced motion

• Where

- Home, Shop, and multiple components use `framer-motion` animations (some above-the-fold).

• Why it matters

- Excessive or early animations can increase main-thread work and input delay on initial interaction.

• Quick wins (low risk)

- Use `prefers-reduced-motion` to disable or simplify heavy animations.
- Limit `AnimatePresence` to components that truly need exit animations; avoid wrapping large lists.
- Trigger animations only when in view (`viewport={{ once: true, amount: 0.3 }}`) for below-the-fold sections.

• Validation

- INP improvements and fewer long tasks in Performance traces during initial scroll and clicks.

---

## P2: Reduce "use client" surface area / move data fetching server-side

• Where

- Many pages are client components even when they mostly render read-only data.

• Why it matters

- Client-only renders ship more JS and delay hydration. Server rendering with caching improves TTFB and overall responsiveness.

• Next steps (medium effort)

- For read-heavy pages (e.g., Events), move fetching to a server route/handler and render as a server component, streaming the shell early and hydrating only interactive pieces.
- Cache results with `revalidate` and ensure Firestore queries are targeted.

---

## P2: Header auth state and layout stability

• Where

- `src/app/components/Header.js` reads `localStorage` on mount to decide which user icon to show; initial server/first paint may not match client, risking small CLS or flicker.

• Quick wins

- Render a stable placeholder size for the user avatar slot to prevent shift.
- Consider lifting auth state to a cookie/session surfaced to server components, or delay swapping the icon until after hydration with a skeleton matching final dimensions.

---

## R3F scene tuning checklist

- [x] Single `<Canvas>` on home; remove the second to avoid double render loops.
- [x] Add `<Canvas dpr={[1,1.5]} gl={{ powerPreference: 'low-power', antialias: false }} />`.
- [x] Lazy-mount the canvas only when hero is in view; unmount when scrolled past.
- [x] Reduce particle count on smaller screens; guard via `matchMedia`.
- [x] Gate 3D behind `prefers-reduced-motion`.
- [ ] Consider `frameloop="demand"` plus throttled invalidation or reduced update frequency.

## Firestore query optimization checklist

- [x] Events: switch to `where('dateTime','>=', Timestamp.now())` + `orderBy('dateTime','asc')` + `limit(n)`.
- [x] Tickets: replace N+1 reads with a `collectionGroup('ragers')` query and optionally denormalize to avoid extra joins.
- [ ] Add indexes as needed for compound queries (Console -> Indexes).
- [ ] If moving server-side, set appropriate cache headers and `revalidate` intervals.

## Image standardization checklist

- [ ] Migrate header logo and other above-the-fold images to Next/Image with `priority` and fixed dimensions.
- [ ] Replace raw `<img>` usage in product tiles, blog lists, and account UI with `<Image>`.
- [ ] Provide `sizes` attributes for responsive layouts; use `fill` when appropriate.
- [ ] Replace GIFs with MP4/WebM or WebP; use `<video>` for large hero animations.

## Measurement plan

1. Establish baselines with Lighthouse (Mobile) on: Home, Events, Shop
2. Record: LCP, CLS, INP, Total JS, CPU time, GPU time (Performance tab)
3. Apply P0 fixes; re-measure and compare
4. Apply P1 fixes; re-measure
5. Track real-user metrics with `@vercel/analytics` and Speed Insights for regression detection

## Suggested rollout order

1. P0 Home 3D: single canvas + dpr + lazy-mount + particle reduction
2. P0 Events query: server-side or client-side targeted query + limit
3. P0 TicketsTab: collection group query and denormalization plan
4. P1 Image standardization (header + home + shop)
5. P1 Media optimization (GIF -> MP4/WebM), Framer Motion reductions
6. P2 Server-side rendering for read-heavy pages and stable header auth rendering

---

## P0: Excessive localStorage operations blocking main thread

• Where

- `src/app/account/page.js`: Multiple synchronous `localStorage.getItem()` calls in useEffect on mount (8+ operations)
- `src/app/components/Header.js`: localStorage reads on every render for auth state
- `src/app/auth/AuthCheck.js`: Heavy localStorage operations on app initialization
- Multiple components reading/writing to localStorage without batching

• Why it matters

- localStorage is synchronous and blocks the main thread, especially problematic on slower devices
- Reading from localStorage on every render creates unnecessary work and can delay paint
- Multiple sequential localStorage operations compound blocking time

• Quick wins (low risk)

- Batch localStorage reads into a single operation: create a helper that reads all auth-related items at once
- Cache localStorage values in memory/state and only re-read when necessary
- Move localStorage operations off the critical render path (useEffect with proper cleanup)
- Use sessionStorage for temporary data that doesn't need persistence

• Better (medium effort)

- Consider moving auth state to HTTP-only cookies for SSR compatibility

• Validation

- Chrome Performance tab: measure main thread blocking time during initial page load
- Test on slower devices/CPU throttling

---

## P0: Shopify product fetching inefficiency

• Where

- `shopify/shopifyService.js`: `client.product.fetchAll()` loads entire product catalog on every shop visit
- `src/app/shop/page.js`: Re-fetches all products on every component mount
- Product search by slug requires fetching ALL products then filtering client-side

• Why it matters

- Loading entire product catalog is wasteful for bandwidth and memory
- No caching means repeated expensive API calls
- Client-side filtering delays time-to-interactive

• Quick wins (low risk)

- Implement pagination in Shopify queries (first: 20, after: cursor)
- Add simple in-memory caching with TTL for products list
- Use Shopify's GraphQL API for more targeted queries
- Cache product slugs separately to avoid re-fetching entire catalog for slug validation

• Better (medium effort)

- Move to server-side product fetching with Next.js API routes and HTTP caching
- Implement ISR (Incremental Static Regeneration) for product pages

• Validation

- Network tab: measure payload size and request frequency reduction
- Time-to-interactive improvement on shop page

---

## P1: Promise.all cascading in TicketsTab creating waterfall

• Where

- `src/app/account/components/TicketsTab.js`: `Promise.all(ticketsPromises)` where each promise contains nested async operations

• Why it matters

- The N+1 query pattern combined with Promise.all creates a cascade of dependent requests
- Poor error handling means one failed event query can break the entire tickets view

• Quick wins (low risk)

- Replace with the previously mentioned collectionGroup query
- Add proper error boundaries and fallback UI for failed ticket loads
- Implement retry logic for failed Firestore requests

---

## P1: Inefficient re-renders and missing memoization

• Where

- `src/app/account/page.js`: Heavy `useMemo` operation recreated on every render for `tabComponents`
- Multiple components creating new objects/functions in render without `useCallback`/`useMemo`
- Login page creates new callback functions on every render despite `useCallback`

• Why it matters

- Unnecessary re-renders consume CPU and can cause UI jank
- Child components re-render when parent creates new references

• Quick wins (low risk)

- Audit `useCallback` dependencies - many have missing or incorrect deps
- Memoize expensive computations and object/array creation in render
- Split large components (like account page) into smaller, focused components
- Use React DevTools Profiler to identify unnecessary re-renders

---

## P1: Timer and interval memory leaks

• Where

- `src/app/shopbanner/page.js`: `setInterval` properly cleaned up ✓
- `src/app/events/page.js`: `setTimeout` for loading delay - could be cancelled
- Various components may have uncleaned timers in edge cases

• Quick wins (low risk)

- Audit all `setTimeout`/`setInterval` usage for proper cleanup
- Consider using `useEffect` cleanup functions consistently
- Add abort controllers for fetch requests that can be cancelled

---

## P2: AuthCheck running expensive operations on every render

• Where

- `src/app/auth/AuthCheck.js`: Mounted in root layout, runs token validation logic frequently

• Why it matters

- Auth checks run on every navigation, even when not needed
- Token refresh logic could trigger unnecessary API calls

• Quick wins (medium effort)

- Move to a more efficient auth state management pattern
- Cache token validation results with proper TTL
- Only run expensive checks when tokens are actually close to expiring

---

## P2: Heavy JSON operations and serialization

• Where

- Multiple locations: `JSON.parse(localStorage.getItem())` without try/catch
- `src/app/events/[slug]/page.js`: Large event objects stored/retrieved from localStorage
- Various API responses parsed without error handling

• Quick wins (low risk)

- Add try/catch around all JSON.parse operations to prevent crashes
- Validate parsed data structure before using
- Consider storing minimal data in localStorage and fetching details on demand

---

## Bundle size and JavaScript optimization checklist

- [ ] Audit bundle size with `npm run build` and look for large chunks
- [ ] Implement code splitting for admin routes and less-used features
- [ ] Tree-shake unused Framer Motion, Three.js, and Heroicons imports
- [ ] Consider lazy loading non-critical components (admin, guest mix, etc.)
- [ ] Move large dependencies (Three.js ecosystem) to dynamic imports

## localStorage optimization checklist

- [ ] Batch localStorage reads in a single helper function
- [ ] Cache localStorage values in React state/context
- [ ] Add error handling for localStorage access (private browsing, full storage)
- [ ] Implement localStorage abstraction with TTL

## Data fetching optimization checklist

- [ ] Implement caching layer for Shopify products (memory + TTL)
- [ ] Add pagination to product fetching
- [ ] Replace client-side filtering with server-side queries
- [ ] Add loading states and error boundaries for all async operations
- [ ] Implement retry logic for failed network requests
- [ ] Use React Query or SWR for smarter data fetching and caching

---

If you want, I can implement the P0 items behind small guarded PRs so we can validate improvements incrementally.
