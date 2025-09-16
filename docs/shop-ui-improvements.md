# Shop UI Improvements Plan

Owner: Web
Status: Draft
Updated: 2025-09-15

## Goals

- Increase product discovery and conversion on Shop and Product Detail.
- Improve LCP and perceived performance with stable images and skeletons.
- Ensure accessible, keyboard-friendly flows and clear error handling.

## Scope

- Shop List: `src/app/shop/page.js` + shared components (`components/ProductTile`)
- Product Detail: `src/app/shop/[slug]/*` + `components/ProductDetail`
- Shopify integration: `shopify/shopifyService.js`

---

## Shop Grid

- **Filters & Sort:** Category, size, color, price, availability; sort by price/newness. Persist to URL (`?q=&sizes=&colors=&price=&avail=&sort=`). Provide a clear "Reset filters".
- **Quick View:** Modal with gallery, variant selection, and add-to-cart without leaving grid.
- **Product Cards:** Stronger hover, consistent spacing, clear price emphasis. Show variant badges.
- **Badges:** "New" (published within 30 days), "Limited" (< 5 left), "Sale" (has compare_at_price).
- **Imagery & Layout:** Stable aspect (4:5 or fixed responsive heights). Mark first row images as `priority` when likely above the fold.
- **Loading/Empty:** Skeleton grid on load; polished "No results" state with CTA to clear filters.
- **Preference Persistence:** Remember grid/list in `localStorage` and reflect via `?view=grid|list`.

## Product Detail

- **Sticky Layout:** On desktop, sticky ATC panel while gallery scrolls; on mobile, sticky bottom bar with price + ATC.
- **Variant UX:** Button pills for sizes/colors; disable unavailable; show per‑variant stock; update price on selection.
- **Media Carousel:** Swipeable gallery with thumbnails; tap to open lightbox; pinch/zoom where supported.
- **Availability & Notify:** When OOS per variant, expose "Notify me" (email/FCM) capturing product + variant.
- **Trust & Clarity:** Inline shipping/returns accordions; size guide link; optional social proof (stars + count).
- **Recommendations:** "Related products" (same collection/tags) near the bottom; horizontally scrollable.

## Shared UX

- **Out of Stock:** Clear OOS messaging; disable CTAs; offer notification opt‑in.
- **Share & Breadcrumbs:** `Home > Shop > Product` trail; copy/share buttons on PDP.
- **Error Handling:** Friendly recoverable errors; retry button; console logs with product id/slug for diagnostics.

## Performance & SEO

- **LCP Focus:** Use stable image wrappers with explicit height or aspect ratio. Only `priority` the first visible images.
- **Next/Image:** Ensure `images.remotePatterns` includes Shopify hosts; set accurate `sizes` attributes.
- **Prefetching:** `next/link` prefetch on hover/focus; `router.prefetch` PDP JSON when hovering grid cards.
- **Structured Data:** Add Product JSON‑LD (name, images, SKU, brand, offers) in `[slug]/page.js` via metadata.
- **Stable Slugs:** Prefer Shopify `product.handle` for URLs. Maintain legacy title‑slug fallback for robustness.
- **Caching:** Keep short TTL cache in `shopifyService`; consider per‑handle cache for PDP prefetch.

## Accessibility

- **Alt Text:** Prefer `image.altText || product.title`.
- **Focus States:** Visible focus outlines for tiles, filters, and ATC.
- **Labels & ARIA:** Descriptive labels for variant controls; `aria-live` region for ATC confirmations.
- **Keyboard:** Quick View modal trap; `Esc` to close; predictable tab order.
- **Contrast:** Verify against WCAG AA; test dark backgrounds with white/red brand colors.

---

## Phased Delivery

### Phase 1 — Routing & Layout Hardening

- [x] Switch PDP routing to `product.handle`; update `ProductTile` href to `/shop/${product.handle}` (fallback to formatted title).
- [x] Update `fetchShopifyProductBySlug` to fetch by handle first; fallback to title‑slug.
- [x] Standardize image wrappers in grid and PDP (explicit responsive heights).
- [x] Add skeletons for grid and PDP; remember grid/list in URL + `localStorage`.

Acceptance:

- [x] Grid and PDP images no longer trigger fill/height warnings.
- [x] Links use handles; old title slugs still resolve via fallback.

### Phase 2 — Filters & Sort

- [x] Build filter panel (collapsible on mobile); wire to URL state and apply client‑side filtering. (UI commented while catalog is 1 item; logic retained)
- [x] Add basic sort (price asc/desc, newest). Persist to URL.
- [x] Add reset and result counts; graceful empty state.

Acceptance:

- [x] Changing filters updates URL and results; reload preserves state.

### Phase 3 — PDP Enhancements

- [x] Variant pills with availability; price updates per selection; sticky ATC (desktop) and bottom bar (mobile).
- [x] Gallery slider with thumbnails and lightbox.
- [x] Product JSON‑LD and improved OG/Twitter metadata.

Acceptance:

- [x] Selecting a variant updates price/availability; keyboard accessible.

### Phase 4 — Quick View & Recommendations

- Quick View modal on grid tiles with basic variant selection and ATC.
- "Related products" rail on PDP (collection/tags).

Acceptance:

- Quick View works via mouse/keyboard; PDP shows related items.

### Phase 5 — Accessibility & Polish

- Alt/focus/ARIA audit and fixes.
- Share buttons and breadcrumbs.

Acceptance:

- Axe/lighthouse a11y ~90+; keyboard flows pass smoke tests.

---

## Implementation Notes

- **Handles:** Prefer `product.handle` in routes and lookups; keep fallback to formatted title for resilience.
- **Image Sources:** Pick from `images[0].src`, `featuredImage.src`, or `variants[0].image.src` (support `transformedSrc`).
- **Next Config:** Ensure `cdn.shopify.com` (and if necessary `*.myshopify.com`) in `images.remotePatterns`.
- **Skeletons:** Keep skeleton blocks sized to final layout to minimize CLS.
- **Events:** Track filter usage, Quick View opens, add‑to‑cart from grid vs PDP for future optimizations.

## Open Questions

- Do we want server‑side filtering via Shopify collections/tags or keep client‑side for now?
- Should we gate Quick View behind desktop only, or enable on mobile with a full‑screen sheet?
- How do we want to compute "New" (publish date vs. first seen) given caching windows?

## Definition of Done

- Core flows (browse → filter → PDP → ATC) are fast, accessible, and resilient to missing fields.
- Product URLs use handles; structured data is present on PDP; images have stable containers.
- QA checklist passes on mobile and desktop (navigation, keyboard, and screen reader sanity).
