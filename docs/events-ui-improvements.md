# Events UI Improvements Plan

Owner: Web
Status: Draft
Updated: 2025-09-15

## Goals

- Increase event discovery and conversion (RSVP/Tickets) across Events list and Event detail.
- Improve perceived performance with skeletons and stable media.
- Ensure accessible, keyboard-friendly flows with clear empty/error states.

## Scope

- Events List: `src/app/events/page.js` + shared components (`components/EventTile`, `EventSkeleton`, `NoEventTile`)
- Event Detail: `src/app/events/[slug]/page.js` + `components/EventDetails`
- Data: Firestore `events` collection; client-side fetch/query

---

## Events List

- **Above-the-fold clarity:** Add concise hero header with subcopy and a visible CTA to "Suggest an event" or link to socials.
- **Filters & Sort (minimal):**
  - Filters: `city/region`, `date range` (upcoming week/month), `type` (concert/rave/meetup).
  - Sort: by `date` (asc/desc). Persist selection in URL (e.g., `?date=asc&type=rave&city=sd`).
  - Keep UI hidden behind a single "Filters" button if catalog is small; retain logic only if needed.
- **Card consistency:**
  - Stable image aspect (e.g., 16:9 or fixed height). Ensure `alt` defaults to `event.title`.
  - Prominent date/time block (weekday, day, month) and location. Add "Sold out" or "Free" badges.
  - Hover state: gentle lift/opacity; keyboard focus ring.
- **Empty state:** Keep `NoEventTile`, add CTA to return to all or follow socials. Offer "Notify me" signup if appropriate (deferred).
- **Loading:** Keep skeleton grid. Match dimensions to final cards to avoid CLS.
- **Pagination/Load more:** If events > 24, add "Load more" button that advances Firestore cursor; avoid unbounded lists.
- **Perf:**
  - Ensure `images.remotePatterns` covers any external event images.
  - Avoid re-renders by memoizing tiles; use keys as `event.id` only.

## Event Detail

- **Breadcrumbs + Share:** `Home > Events > [Event]` trail with a copy-to-clipboard "Share" button (consistent with PDP).
- **Header block:**
  - Display title, date/time (converted to local timezone), venue/location, and quick badge (Age 18+/21+, Free/Sold Out).
  - Provide a prominent primary CTA: `Get Tickets` or `RSVP` (if provided in data), disabled when unavailable.
- **Media:** Stable hero image with `object-cover` and aspect ratio; optional gallery if `images[]` > 1 (deferred).
- **Details sections:**
  - Description (rich text OK via `dangerouslySetInnerHTML`), lineup, schedule, FAQs.
  - Map link (Google/Apple) if `lat/lng` or address present.
- **A11y:**
  - Ensure headings order (h1 only once). Labels for CTAs. Visible focus rings.
  - Keyboard operable share/copy. Live regions for async errors (fetch failures).
- **Perf/Resilience:**
  - Guard null fields and provide fallbacks; never crash on missing optional fields.
  - Use consistent skeleton for detail load to avoid layout shifts.

## Shared UX

- **Timezone awareness:** Convert Firestore `Timestamp` to user's local tz with clear format, e.g., `Fri, Sep 19 · 8:00 PM` with tz hint on detail page.
- **Badges:** `Sold Out`, `Few Left`, `Free`, `18+ / 21+` derived from fields like `ticketStatus`, `price`, `ageRestriction`.
- **Notifications (deferred):** Optional "Remind me" via push/email when status changes or event nears.
- **Error handling:**
  - Friendly messaging on fetch failures; retry affordance. Console logs include event id/slug.

---

## Phased Delivery

### Phase 1 — List Hardening

- [x] Add stable image aspect and consistent card layout.
- [x] Add skeleton + empty state polish.
- [x] Introduce minimal sort by date (asc) and URL param (logic OK; UI can be tucked).

Acceptance:

- [x] Cards are consistent; images do not shift; list renders quickly with skeletons.

### Phase 2 — Detail Polishing

- [x] Add breadcrumbs and copy-to-clipboard share.
- [x] Add prominent hero with title/date/location and primary CTA.
- [x] Ensure graceful fallbacks for missing fields.

Acceptance:

- [x] Detail page reads clearly at a glance; Share copies URL reliably.

### Phase 3 — Filters & Pagination

- Add light filters (type/city/date range) with URL state.
- Add "Load more" pagination if count > 24.

Acceptance:

- Filters affect results and survive reload; load more fetches the next page.

### Phase 4 — Accessibility & Map Links

- Audit focus states and headings; add map link when address present.
- Add aria-live region for fetch errors.

Acceptance:

- Keyboard flows pass; copying and CTAs are operable with visible focus.

---

## Implementation Notes

- Firestore query: keep `where('dateTime','>=', now)` and `orderBy('dateTime','asc')`; add cursor for pagination when needed.
- Slugging: detail currently uppercases words and handles "Concert + Rave" special case; consider storing a URL-safe slug in Firestore to avoid brittle transforms (non-breaking migration later).
- Image sources: prefer event image URL; fallback to a branded placeholder.
- Reusability: share PDP copy-to-clipboard util to stay consistent.
- Telemetry: consider lightweight analytics for views and clicks on `Get Tickets`.
