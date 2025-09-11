# RAGESTATE Social UI Design Specification

Version: 1.0  
Audience: Designers, Frontend Engineers, Product, QA  
Scope: Feed + Chat (MVP → V2) visual + interaction design, accessibility & performance constraints.

---

## 1. Product Vision

A fast, expressive, dark-first social layer that feels kinetic without being noisy. Users should:

- Scan: Glance high-signal content density (stories later, posts now)
- Create: Low-friction composer (text → media → tag → post in <12s)
- Converse: Fluid message flow with optimistic interactions and subtle presence cues
- React: Lightweight emotional signaling (reactions, typing, online) without overwhelming screen real estate

KPIs: Time-to-first-post, Scroll depth, DAU retention, Message reply latency, Post reaction rate.

---

## 2. Design Principles

| Principle              | Description                          | Implementation Tactics                                                |
| ---------------------- | ------------------------------------ | --------------------------------------------------------------------- |
| Fast Perception        | First visual paint feels instant     | Skeletons + content shimmer within 150ms; defer heavy media offscreen |
| Visual Hierarchy       | Author + content > chrome            | Muted container backgrounds; strong type scale for author & actions   |
| Motion With Restraint  | Motion conveys state change only     | 150–220ms ease-out fades/slides; no gratuitous continuous animations  |
| Tap Precision          | Mobile-first ergonomic targets       | 44px min hit area; clustered actions right-aligned for thumb reach    |
| Progressive Disclosure | Show essentials, reveal depth        | Collapse long text > 300 chars; lazy load comments & reactions list   |
| Theme Cohesion         | Brand neon energy on dark canvas     | Token-driven color + accent states limited to primary interactions    |
| Mobile-first           | Design primarily for small viewports | Prioritize vertical flow, thumb zones, safe-areas; enhance at ≥sm     |

---

## 3. Foundations

### 3.1 Color Tokens (Dark Mode Primary)

```
--bg-root: #050505;
--bg-elev-1: #0d0d0f;
--bg-elev-2: #16171a;
--bg-reverse: #ffffff;
--border-subtle: #242528;
--border-strong: #34363a;
--text-primary: #f5f6f7;
--text-secondary: #a1a5ab;
--text-tertiary: #5d6269;
--accent: #ff1f42; (RAGESTATE red)
--accent-glow: #ff415f;
--accent-muted: #ff1f4240;
--success: #3ddc85;
--warning: #ffb347;
--danger: #ff4d4d;
--focus-ring: #ff1f42;
--reaction-fire: #ff8a1f;
--reaction-wow: #ffd31f;
--reaction-like: #3d8bff;
--presence-online: #3ddc85;
--presence-idle: #ffb347;
```

Light mode: invert bg tokens (bg-root → #fafafa; elev surfaces progressively darker) while preserving accent contrast; text-secondary shifts to #555.

### 3.2 Typography Scale

| Role                         | Size    | Weight | Tracking |
| ---------------------------- | ------- | ------ | -------- |
| Display (hero / optional)    | 28–32px | 700    | -1%      |
| Section / Feed heading       | 20px    | 600    | -0.5%    |
| Post author                  | 15px    | 600    | 0        |
| Body                         | 15px    | 400    | 0        |
| Meta / timestamps / counters | 12px    | 500    | 2%       |
| Button / Chip                | 13px    | 600    | 2%       |

Font Recommendation: Use current brand font stack; ensure variable weight loading limited (400/500/600/700 only).

### 3.3 Spacing Scale (in px)

4, 8, 12, 16, 20, 24, 32, 40.  
Component internal padding defaults: Card (16), Bubble (12), Composer (16 / 12), List gutter (8 vertical).

### 3.4 Radius & Elevation

| Surface           | Radius | Shadow                |
| ----------------- | ------ | --------------------- |
| Card              | 14     | 0 4px 12px -4px #000c |
| Bubble (chat)     | 18     | 0 2px 6px -2px #000a  |
| Composer / Modals | 20     | 0 8px 28px -8px #000f |
| Reaction picker   | 16     | 0 6px 20px -6px #000e |

Use subtle 1px borders with translucency for contrast layering: `border: 1px solid rgba(255,255,255,0.06)`.

### 3.5 Iconography

Heroicons outline + minimal custom glyphs (reactions). Stroke width consistent (1.5). Action icons 20px; micro icons (presence dots) 8–10px.

### 3.6 Responsive Grid & Breakpoints (Mobile-first)

Baseline target devices: 360×740, 390×844, 414×896 (iOS/Android modern). Use fluid widths with consistent side gutters.

- Breakpoints (Tailwind):

  - base: <640 (mobile, default styles)
  - sm: ≥640 (small tablet/landscape phones)
  - md: ≥768 (tablet)
  - lg: ≥1024 (desktop)
  - xl: ≥1280 (wider desktop)

- Containers & gutters:

  - Mobile: full-bleed with 16px side padding (`px-4`) unless media requires edge-to-edge.
  - sm–md: center content with `max-w-[720px]` for feed column.
  - lg+: `max-w-[1040-1160px]` with optional secondary column.

- Safe areas (iOS notch/home indicator):

  - Add `padding-bottom: env(safe-area-inset-bottom)` for bottom sheets, sticky bars, and FABs.
  - Header: `height: 56–64px`; if fixed, set `padding-top` on pages to prevent overlap.

- Touch ergonomics:

  - Hit targets ≥44×44px; minimum spacing 8px between tap targets.
  - Place primary actions within right-thumb zone on mobile where possible.

- Keyboard/IME avoidance:

  - Composer and inputs must avoid the on-screen keyboard; use viewport units (`dvh`) and safe-area padding. On iOS Safari, prefer `100dvh` over `100vh`.

- Typography scaling:

  - Use `clamp()` for headings, e.g., section title `clamp(18px, 2.8vw, 20px)`.
  - Keep body at 15–16px base; don’t go below 14px on mobile.

- Images & media:
  - Use `next/image` with `sizes="(max-width: 640px) 100vw, 640px"` for feed media.
  - Lazy-load offscreen; prefetch only the first in-viewport media.

---

## 4. Feed UI

### 4.1 Layout

| Breakpoint | Columns                                      | Max Width   | Notes                               |
| ---------- | -------------------------------------------- | ----------- | ----------------------------------- |
| <640       | 1                                            | 100%        | Edge-to-edge with 16px side padding |
| 640–1023   | 1 + side meta (optional later)               | 720px       | Centered                            |
| ≥1024      | 1 primary + 1 secondary (suggested / trends) | 1040–1160px | Secondary column lazy-loaded        |

Mobile-specific behaviors:

- Sticky header at top with translucent background; page content padded (`pt-16/24`).
- Optional “new posts” pill appears under header, centered; tap scrolls to top and merges.
- Action bar icons spaced for thumb tap; label-less on mobile, labeled at lg+ if needed.
- Media respects device orientation; limit max height to 60vh to avoid full scroll lock.

### 4.2 Post Card Structure

```
[Avatar] [Author · handle]        [Overflow]
[Timestamp inline right on mobile under author]
[Body text truncated (line-clamp 5) + "See more" if > 300 chars]
[Media gallery (1–4) or video with aspect ratio 16:9 / 1:1]
[Tag / hashtag chips (scrollable row, lazy render if >2)]
[Action bar]
  (Like/React)  (Comment)  (Share)  (Save?)    [Reaction count cluster]
[Inline reaction faces row (top 3 types) + comment count + view count (future)]

Responsive notes:
- Author row wraps: timestamp breaks to next line (`sm:inline`)
- Truncate body with `line-clamp-5` on mobile; relax to 7–8 lines on md+.
- Overflow menu becomes long-press on mobile; click/hover on desktop.
```

### 4.3 Interaction States

- Hover / Focus: accent-muted background wash 4% alpha.
- Press (mobile): 8% accent-muted overlay.
- Keyboard: 2px focus ring (offset 2px) in accent.
- Overflow menu: aligned to card edge; actions (Edit, Delete, Report, Copy Link).

### 4.4 Media Handling

| Media Count | Layout                                                                          |
| ----------- | ------------------------------------------------------------------------------- |
| 1           | Full width, radius 16, aspect maintained, max height 60vh with object-fit cover |
| 2           | Two equal columns (gap 4)                                                       |
| 3           | Left tall (60%) + right stack (2 x 30% height)                                  |
| 4           | 2x2 grid                                                                        |

Lazy load offscreen images via IntersectionObserver root margin 400px. Preload first image in viewport. Use blurred placeholder (dominant color extraction optional Phase 2).

### 4.5 Reactions UI (Feed)

- Single tap on main reaction icon toggles last used reaction (default "like").
- Long press / hover opens reaction bar above action row (spring scale 0.92→1, 140ms).
- Selected reaction animates with 1-frame pop (scale 1.15 then settle 1).
- Aggregation cluster: stack top 3 reaction glyphs (overlapping 4px) + total count; tooltip on hover enumerates counts.

### 4.6 Skeletons

- Card skeleton height variable (simulate 2–5 lines). Gray pulse: `linear-gradient(90deg,#1a1a1c,#242428,#1a1a1c)` 1200ms.
- Media placeholder: aspect ratio preserved with neutral #111 and subtle shimmer streak.

### 4.7 Infinite Scroll & New Content Banner

- Append sentinel 600px before bottom; auto-prefetch next page.
- If new posts arrive while user is not at top: show floating "New Posts (3)" pill at top center (sticky fade-in). Tap scrolls & merges.

Mobile guidance:

- Avoid scroll jank: observer rootMargin `400px`; keep list items stable height to reduce layout shifts.
- Keep page size modest (8–12) on mobile to limit memory pressure; hydrate progressively.

### 4.8 Error & Empty States

| State      | Copy                                     | Action                                  |
| ---------- | ---------------------------------------- | --------------------------------------- |
| Empty feed | "Your feed is warming up."               | Button: "Find creators" (discover page) |
| Load fail  | "Couldn’t load posts."                   | Retry button                            |
| Offline    | Banner: "Offline – showing cached posts" | Dismiss X                               |

---

## 5. Post Composer

### 5.1 Flow

1. Collapsed inline field: "Share what’s in your RAGESTATE…"
2. Expand → modal sheet (mobile bottom sheet with safe-area padding; desktop centered) with fields: Text (auto-grow), Media tray, Tagging (Phase 2), Visibility toggle.
3. Primary button active after text length > 1 OR media attached.

### 5.2 Controls

| Element           | Behavior                                                                         |
| ----------------- | -------------------------------------------------------------------------------- |
| Text area         | Max 2,400 chars; live counter after 1,800. Soft warning at 2,200 (accent-muted). |
| Media picker      | Drag/drop (desktop) + file input; show slots; remove with X.                     |
| Compression badge | Show image size reduction after upload (optional V2).                            |
| Visibility        | Public (default) / Followers / Private dropdown.                                 |
| Submit            | Loading state merges into success check, then shrink-dismiss.                    |

### 5.3 Draft Persistence

Local (sessionStorage) autosave every 3s if dirty. Recover prompt if last draft <6h old.

---

## 6. Chat UI

### 6.1 Chat List

```
[Header]: Chats      [New +]
[Search field]
[List Item]
  Avatar (presence dot)  Name + (unread badge)  Last message snippet + timestamp right
  Swipe (mobile): left → Pin, right → Mute/Delete
```

### 6.2 Chat Room Layout

```
[Top Bar]
  Back   Avatar   Name (typing…)   Overflow
[Scrollable Message Column]
  Day Divider
  Message Group (sender cluster)
    Bubble(s)
[Scroll-To-Latest FAB] (appears if > 600px away)
[Composer Bar]
  [+]  Text field (grow up to 6 lines)  [Emoji] [Send]

Mobile specifics:
- Keep top bar 56px; larger touch targets for Back and Send.
- When keyboard opens, keep “Scroll-To-Latest” accessible above keyboard.
```

### 6.3 Message Bubble Variants

| Type          | Style                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| Outgoing      | Accent gradient subtle (linear 145deg #ff1f42→#ff415f 12% opacity); text-primary on dark |
| Incoming      | Elev-2 bg + border-subtle; text-primary                                                  |
| System        | Centered small pill, text-secondary, bg-elev-2 50%                                       |
| Media         | Rounded container; show image/video; tap to full-screen viewer                           |
| Reply (quote) | Top inset bar (2px accent) + quoted line ellipsis; tap scroll to source                  |

Time + status (✓, ✓✓ read) shown on hover (desktop) or long press (mobile) or inline in small text under last bubble in a cluster.

### 6.4 Presence & Typing

- Presence dot: solid presence-online or idle fill; subtle outer glow on active (box-shadow 0 0 0 2px #0d0d0f).
- Typing indicator: three dots morph scale (1 → 0.6 → 1) staggered 250ms; total cycle 900ms; paused in reduced-motion mode.

### 6.5 Reactions (Chat)

- Long press (mobile) / hover toolbar (desktop) above bubble.
- Reaction pop cluster appears anchored to top-right of bubble; max 6 shown; overflow count "+2".
- User’s own reaction icon slightly brighter (add inner shadow highlight).

### 6.6 Composer

| Feature            | Spec                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| Autosize           | Up to 6 lines; then internal scroll.                                                                  |
| Send button        | Enabled when trimmed length > 0 OR media attached.                                                    |
| Emoji picker       | Lazy mount; categories horizontal scroll; search filtering.                                           |
| Attachments        | Show inline chips with thumbnail + progress ring while uploading.                                     |
| Optimistic sending | Bubble enters with 60% opacity + spinner; resolves on ack; error state shows red border + retry icon. |

### 6.7 Scroll & Performance

- Virtualize message list after > 120 messages loaded. Keep overscan small (4 screens).
- Anchor scroll restoration when loading earlier messages (maintain viewport first visible message).
- Avoid layout shift: reserve bubble max width on measure.

### 6.8 Accessibility

| Area         | Consideration                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------- |
| Roles        | List: `role="log"` with `aria-live="polite"` for new messages (but suppress during user scroll up). |
| Keyboard     | Tab order: message cluster action → composer → header actions.                                      |
| Contrast     | Maintain WCAG AA for text-secondary on backgrounds (≥4.5:1).                                        |
| Motion       | Respect `prefers-reduced-motion`: disable shimmer, use fade-only.                                   |
| Emoji labels | `aria-label` created from short name (fire, wow).                                                   |

---

## 7. Motion Specs

| Motion            | Duration | Curve                        |
| ----------------- | -------- | ---------------------------- |
| Feed card enter   | 160ms    | cubic-bezier(.18,.8,.32,1)   |
| Reaction bar open | 140ms    | ease-out                     |
| Bubble send       | 120ms    | ease-out + translateY(8px→0) |
| Typing dots loop  | 900ms    | linear sequence              |
| New posts pill    | 220ms    | ease + slideDown & fade      |

Reduce all durations by 30% on high-motion user interactions to keep responsiveness crisp.

---

## 8. State & Loading Patterns

| Pattern                  | Behavior                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| Skeleton first load      | Replace with real content no later than 1,200ms or show fallback error.                             |
| Optimistic create (post) | Insert local post stub (pending badge) → replace on success → if fail show inline error with retry. |
| Offline mode             | Desaturate avatars (grayscale) + banner; composer disabled with tooltip.                            |
| Error toast              | Bottom center stacked; auto-dismiss 5s; accessible with role="alert".                               |

---

## 9. Component Inventory (Build Order)

1. Tokens / ThemeProvider
2. Avatar (presence) + Reaction glyph set
3. Skeleton primitives
4. PostCard + MediaGrid
5. ReactionBar (shared feed/chat variant prop)
6. PostComposer
7. FeedContainer (pagination + banner)
8. ChatListItem & ChatList
9. MessageBubble (variants) + VirtualizedList wrapper
10. ChatComposer
11. TypingIndicator
12. Modals: MediaViewer, ReactionsList

---

## 10. Performance Budget (Client)

| Area                                      | Target                                |
| ----------------------------------------- | ------------------------------------- |
| Feed initial JS (incremental)             | < 40KB route chunk (excluding shared) |
| Post card render cost                     | < 3ms (no heavy sync work)            |
| Chat room first interaction (input focus) | < 100ms TTI                           |
| Media lazy load threshold                 | 400px viewport margin                 |
| Re-render on typing (others)              | JSON diff only; no list reflow        |

Mobile-first performance:

- Limit long tasks on main thread; break work into microtasks.
- Avoid large images on cellular; prefer 1080px max width for uploads; serve AVIF/WebP where possible.
- Defer non-critical analytics until idle or next tick after first interaction.

Lazy import: emoji picker, media viewer, reaction picker, analytics tracking hooks.

---

## 11. Theming & Extensibility

- Support brand events: accent swap (e.g., limited-time color) via CSS variable cascade.
- Reaction set extensible: glyph config array → render bar + cluster.
- Message bubble decorator slots (e.g., badges, NFTs) in future without rebuild.

---

## 12. Rollout Phases (UI Focus)

| Phase         | UI Deliverables                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Feed MVP      | Card, composer (text + single image), like reaction, pagination, basic skeletons               |
| Chat MVP      | Chat list, room, text only messages, optimistic send, presence, typing, basic reactions (like) |
| Enhancement 1 | Multi-image grid, reaction palette, unread badges improvements, media attachments in chat      |
| Enhancement 2 | Video posts, full reaction metrics, message replies/thread previews, new posts live banner     |
| Enhancement 3 | Themes, advanced ranking UI signals (trending modules), story rail                             |

---

## 13. QA Checklist (Representative)

- Keyboard nav through feed cards + actions
- Screen reader announces new message without interrupting typing
- Reaction bar opens via keyboard (Enter/Space) and closes on Esc
- Long text wraps, no overflow, ellipsis consistent
- Media error fallback (broken image) shows retry icon
- Offline mode: composer disabled + aria-disabled

---

## 14. Open Questions

| Topic                              | Decision Needed            |
| ---------------------------------- | -------------------------- |
| Threaded comments / replies depth  | MVP omit or 1-level?       |
| Message edit/delete exposure       | Phase timing?              |
| Saved posts feature                | Prioritize before Stories? |
| Cross-posting to external networks | Future?                    |

---

## 15. Implementation Notes (Engineer Handoff)

- Use CSS logical properties for future RTL.
- Prefer CSS vars + Tailwind plugin mapping for tokens (avoid hard-coded hexes).
- Avoid heavy layout effects: measure media once; store dimensions in metadata if possible.
- Virtualization: react-virtual or custom intersection batching for >120 items.
- Reaction animations: Use transform/opacity only; no layout thrash.

Mobile-tailored Tailwind patterns:

- Containers: `px-4 sm:px-6 lg:px-8`, `max-w-2xl mx-auto` for primary column.
- Typography: `text-base sm:text-[15px]` with `clamp()` for headings.
- Sticky/fixed bars: add `backdrop-blur-md` and `supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]`.
- Media: `rounded-2xl overflow-hidden aspect-video sm:aspect-[4/3]` with `object-cover`.

---

## 16. Metrics Instrumentation Hooks

| Event                 | Payload                              |
| --------------------- | ------------------------------------ |
| post_create           | hasMedia, lengthBucket, timeToSubmit |
| post_view             | dwellMs, scrollDepthBucket           |
| reaction_add          | type, targetType(post/message)       |
| message_send          | lengthBucket, latencyAckMs           |
| typing_start          | chatSize                             |
| feed_new_banner_click | unseenCount                          |

---

## 17. Accessibility Summary

- Color contrast >= 4.5:1 for text; reactions glyphs have aria-labels.
- Focus states always visible (2px ring accent).
- Motion reduced gracefully.
- Live regions polite; suppress while user scrolls upward (prevent focus steal).
- Touch access: Ensure 44px min touch targets; add visible pressed states on mobile.

---

## 19. Mobile-first Overview (Quick Reference)

- Layout

  - Single-column flow by default; enhance to two-column at `lg+`.
  - Fixed header; content padded to avoid overlap.
  - Optional bottom sheet composer; respects safe-area insets.

- Ergonomics

  - Hit targets ≥44px; key actions within thumb zone.
  - Avoid edge swipes interfering with OS gestures; keep primary actions inset.

- Performance

  - Smaller page size on feed; lazy-load and avoid reflow.
  - Preload only immediate viewport media.

- Media

  - Maintain aspect ratios; clip rather than stretch.
  - Use `sizes` to tailor image srcset for mobile first.

- Accessibility
  - Proper landmarks; readable base text size; large controls.
  - Motion respects `prefers-reduced-motion`.

This section governs default behavior; desktop is an enhancement.

---

## 18. Future Enhancements (Parking Lot)

- Inline translation badges
- Audio waveform messages
- Gesture-based quick react (swipe on bubble)
- Haptic feedback patterns on mobile app shell (if native wrapper)
- Collaborative draft (multi-user) composer

---

End of Spec.
