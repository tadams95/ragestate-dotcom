# Social UI Mobile-first QA Checklist

This checklist verifies key components against the Social UI Design Spec (mobile-first). Test on 360×740, 390×844, and 414×896, both light/dark where applicable.

## Components in scope

- Header: `src/app/components/Header.js`
- Feed container: `src/app/components/Feed.js` and `src/app/feed/page.js`
- Post (card bundle):
  - `src/app/components/Post.js`
  - `src/app/components/PostHeader.js`
  - `src/app/components/PostContent.js`
  - `src/app/components/PostActions.js`
  - `src/app/components/PostSkeleton.js`
- Post composer: `src/app/components/PostComposer.js`
- Comments sheet: `src/app/components/CommentsSheet.js`
- Chat page (MVP hook): `src/app/chat/page.js`

## 1) Layout & Responsiveness

- [x] Single-column layout on <640px; page gutters `px-4` (≈16px) present.
- [x] Sticky header does not overlap content; pages pad with `pt-16/24` as needed.
- [x] Images/media respect aspect ratio; max height ≈60vh on mobile.
- [x] At ≥lg, feed centers at max-w ~1040–1160px; optional secondary column deferred/lazy.
- [x] Safe areas respected: bottom sheets/FABs have `padding-bottom: env(safe-area-inset-bottom)`.

## 2) Touch Ergonomics

- [x] All interactive targets ≥44×44px (post actions, composer buttons, chat actions).
- [x] Primary actions positioned within right-thumb reach where reasonable.
- [x] Press state visible on mobile (opacity/overlay) for buttons and icons.

## 3) Typography & Hierarchy

- [x] Section heading uses mobile-friendly `clamp()` or 18–20px.
- [x] Body text 15–16px, never <14px on mobile.
- [x] Author name prominent; timestamp wraps below on small screens.

## 4) Feed Behavior

- [x] Infinite scroll prefetches next page around 400–600px before bottom.
- [x] No duplicate keys or repeated posts when composing or paginating.
- [x] New-posts arriving show a banner/pill when scrolled away from top (if implemented).
- [x] Skeletons display on initial load and while fetching additional pages.

## 5) Media & Performance

- [x] `next/image` uses appropriate `sizes` for mobile `(max-width: 640px) 100vw, 640px`.
- [x] Offscreen images are lazy-loaded; only first in-viewport media preloaded.
- [x] Scroll remains smooth on mobile; no layout shift on image load.

## 6) Composer

- [x] Mobile opens as bottom sheet with safe-area padding; desktop centers modal.
- [x] Submit enabled for text >1 char or any media attached.
- [x] Autosave draft to sessionStorage every ~3s when dirty; recover prompt works.

## 7) Comments & Reactions

- [x] Long-press opens reaction bar on mobile (or equivalent UX).
- [x] Reaction counts cluster shows top 3 and total; accessible labels present.
- [x] Comments sheet fits mobile viewport without being hidden by keyboard.

## 8) Chat (MVP)

- [ ] Chat list items show presence dot and last message snippet; swipe interactions planned.
- [ ] Chat room header ~56px; back/send are easy to tap.
- [ ] “Scroll-To-Latest” FAB appears when >600px from bottom and remains accessible with keyboard open.

## 9) Accessibility

- [ ] Text contrast meets WCAG AA on dark backgrounds.
- [ ] Focus ring visible (2px) on all actionable elements.
- [ ] Motion respects `prefers-reduced-motion` (disable shimmer, fade-only).
- [ ] Touch targets meet 44px minimum and have descriptive labels/tooltips.

## 10) Error & Offline

- [ ] Empty and error states match spec copy; retry actions present where relevant.
- [ ] Offline banner appears; composer disabled with aria-disabled.

## 11) Metrics Hooks

- [ ] Instrument post_create, post_view, reaction_add, message_send, typing_start, feed_new_banner_click.

---

Execution tips

- Test in Chrome DevTools device emulation (iPhone 12/14, Pixel 7).
- Exercise slow 4G throttling to validate skeletons and lazy-loading.
- Toggle reduced motion in OS/browser and verify animations degrade.
