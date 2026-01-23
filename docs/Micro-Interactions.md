# Micro-Interactions Implementation Plan

> Subtle, aesthetically pleasing, and memorable motion design for RAGESTATE

**Goal:** Make the app feel alive without being jarring. Focus on feedback, state transitions, and moments of delight.

**Principles:**
- Use `transform` and `opacity` only (GPU-accelerated)
- Respect `prefers-reduced-motion`
- Keep durations short (150-300ms for feedback, 300-500ms for transitions)
- Ease curves: `ease-out` for entrances, `ease-in-out` for state changes

---

## Tier 1: High Frequency (Every Session)

### Post Action Buttons
**File:** `src/app/components/PostActions.js`

- [x] Add scale feedback on press (`active:scale-95` with spring)
- [x] Like heart pulse/burst animation on tap
- [ ] Count number animate when incrementing (scale or slide)
- [x] Emoji reaction float-up animation when selected from picker

**Current state:** Scale feedback, like pulse, emoji float-up implemented

---

### Follow Button
**File:** `src/app/components/Followbutton.js`

- [x] Smooth state transition between Follow/Following (color + icon morph)
- [ ] Checkmark flash on successful follow
- [x] Subtle pulse while loading/processing
- [x] Hover lift (`hover:scale-105`)

**Current state:** Smooth transitions, pulse on save, hover lift implemented

---

### Post Cards
**File:** `src/app/components/Post.js`

- [x] Hover elevation (shadow + subtle bg shift)
- [ ] Scroll reveal animation (stagger fade-in as posts enter viewport) — *requires Feed.js changes*
- [x] Subtle border accent on hover

**Current state:** Hover elevation, border accent implemented

---

## Tier 2: Key Moments (High Impact)

### Notification Bell
**File:** `src/app/components/NotificationBell.js`

- [x] Badge pulse animation when new notification arrives
- [x] Bell wiggle/shake on count change
- [x] Count number scale animation on update

**Current state:** Bell wiggle + badge pop on count change implemented

---

### Chat Bell
**File:** `src/app/components/ChatBell.js`

- [x] Badge pulse animation when new message arrives
- [x] Bell wiggle/shake on count change
- [x] Count number scale animation on update

**Current state:** Bell wiggle + badge pop on count change implemented

---

### Post Composer Modal
**File:** `src/app/components/PostComposer.js`

- [x] Spring entrance animation for modal
- [x] Media preview fade/slide-in
- [x] Smoother video compression progress bar
- [ ] Success animation before modal close
- [x] Privacy toggle smooth switch animation

**Current state:** Modal entrance, preview slide-in, smoother progress implemented

---

### Comments Sheet
**File:** `src/app/components/CommentsSheet.js`

- [ ] Stagger cascade animation (comments fade in with delay) — *requires Framer Motion refactor*
- [x] Like button smooth fade on hover (not instant opacity)
- [x] New comment slides in from bottom
- [ ] Thread expand/collapse animation (arrow rotate + height) — *requires height animation*

**Current state:** Like button transitions, new comment slide-in, button transitions implemented

---

## Tier 3: Polish Layer

### Navigation Links
**File:** `src/app/components/Header.js`

- [x] Animated underline that grows from center on hover
- [ ] Active page indicator with subtle glow/accent bar
- [x] Mobile menu items stagger-in animation

**Current state:** Animated underline on desktop nav links, mobile menu stagger animation implemented

---

### Input Focus States
**Files:** Various form components

- [ ] Focus ring pulse/grow animation
- [ ] Error state shake animation
- [ ] Floating label slide-up on focus (where applicable)
- [ ] Success state subtle bounce/glow

**Current state:** Static focus ring

---

### Product Cards
**File:** `src/app/shop/ShopClient.js` + `components/ProductTile.js`

- [x] Image hover zoom (1.02-1.05x scale)
- [ ] Add to cart button state animation (loading → success checkmark)
- [x] View toggle (grid/list) layout transition
- [x] Card hover elevation

**Current state:** Image hover zoom, card hover elevation, view toggle buttons with transitions implemented

---

### Loading Skeletons
**File:** `src/app/components/PostSkeleton.js` + `src/app/shop/ShopClient.js`

- [x] Replace pulse with shimmer effect (gradient sweep)
- [ ] Content load-in wave animation

**Current state:** Shimmer effect replaces pulse in PostSkeleton and ShopClient loading states

---

## Implementation Notes

### Animation Library
- Framer Motion is already installed and used in `ShopClient.js`
- Use it as the standard for complex animations
- Tailwind transitions for simple hover/active states

### Reduced Motion
```javascript
import { useReducedMotion } from 'framer-motion';
const prefersReducedMotion = useReducedMotion();
// Skip or simplify animations when true
```

### Common Patterns
```javascript
// Scale feedback on press
className="active:scale-95 transition-transform duration-150"

// Hover elevation
className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"

// Stagger children (Framer Motion)
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};
```

### Performance Checklist
- [ ] Only animate `transform` and `opacity`
- [ ] Use `will-change` sparingly
- [ ] Test on low-end devices
- [ ] Verify reduced motion fallbacks

---

## Progress Tracker

| Component | Status | Notes |
|-----------|--------|-------|
| Post Action Buttons | **Mostly done** | Scale feedback, like pulse, emoji float-up. Count animation pending. |
| Follow Button | **Mostly done** | Transitions, pulse, hover lift. Checkmark flash pending. |
| Post Cards | **Mostly done** | Hover elevation, border accent. Scroll reveal needs Feed.js changes. |
| Notification Bell | **Done** | Bell wiggle + badge pop on count change. |
| Chat Bell | **Done** | Bell wiggle + badge pop on count change. |
| Post Composer | **Mostly done** | Modal entrance, preview slide-in, progress bar. Success animation pending. |
| Comments Sheet | **Mostly done** | Like transitions, new comment slide-in. Stagger/expand pending. |
| Navigation Links | **Mostly done** | Animated underline, mobile stagger. Active page indicator pending. |
| Input Focus States | Not started | |
| Product Cards | **Mostly done** | Image hover zoom, card elevation, view toggle. Add to cart animation pending. |
| Loading Skeletons | **Mostly done** | Shimmer effect replaces pulse. Wave animation pending. |
