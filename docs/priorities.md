# Roadmap Priorities

Last updated: 2025-09-14

This document stack-ranks current initiatives from the docs folder by impact, dependencies, and effort. Use it to guide planning and sprint scoping.

## Near-Term (Ship Next)

- **Feed Enhancements (`feed-implementation-guide.txt`)**: Finalize privacy (Public/Private), edit/delete, pagination, composer polish, and author controls (ellipsis in header). Why: core engagement surface; everything else builds on this.
- **Notifications v1 (`notifications-spec.md`)**: In-app feed + push (FCM for Web + Mobile). Includes device registry, prefs, quiet hours, sender function, and simple badge. Why: re-engagement + parity for upcoming RN app.
- **Social UI Polish (`social-ui-design-spec.md`, `social-ui-mobile-qa-checklist.md`)**: Apply consistent patterns (menus, badges, spacing) and run lightweight QA to avoid regressions as notifications land.
- **Abuse Gates (`bot-prevention-plan.md`)**: Add rate limits, basic CAPTCHA/Turnstile, write guards on auth-required endpoints. Why: protect feed and push once usage increases.
- **Performance Essentials (`PerformanceEnhancements.md`)**: Tackle top ROI items only (bundle trims, image strategy, caching). Treat as ongoing.

## Mid-Term (Decide + POC)

- **Realtime Choices (`realtime-implementation-comparison.txt`)**: Only prioritize if we need richer presence/typing/live counters beyond Firestore listeners. Outcome: confirm if current stack suffices or adopt a dedicated realtime layer.
- **Chat POC (`chat-implementation-comparison.txt`)**: Minimal DM/mentions POC if messaging becomes a priority, leveraging the realtime decision. Scope small to validate UX + moderation.

## Later (Strategic Bets)

- **AI Try-On Pilot (`ai-tryon-spec.md`)**: Launch behind waitlist and strict cost controls after core social + notifications are stable. High-impact but higher lift.
- **Monetization Layers (`revenue-ideas.md`)**: Add quick wins (email capture, cross-sells, promos) after engagement stabilizes; deeper revenue features later or alongside Try-On.

## Why This Order

- Maximizes near-term user value (feed, notifications) and reliability (abuse, perf) before heavier bets.
- Keeps web/mobile aligned (FCM), reduces backend complexity, and minimizes rework.

## Dependencies (at a glance)

- Notifications depends on: minimal feed stability, device registry, service worker (web), RN messaging setup (mobile).
- Chat depends on: realtime choice, abuse gates, notifications.
- AI Try-On depends on: rollout/billing guardrails, asset storage, moderation plan.

## Suggested Next Actions (2 sprints)

- Sprint 1: Ship remaining feed polish; stub and deploy notifications sender + web token registration; add basic abuse gates.
- Sprint 2: In-app notifications UI + prefs; mobile FCM token flow; perf passes on heavy views; QA checklist run.

---

Tip: Revisit this doc after each release to adjust priorities based on metrics and user feedback.
