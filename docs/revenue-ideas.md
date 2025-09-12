# Low‑Lift Revenue Ideas (Beyond Tickets/Merch)

These are pragmatic, fast-to-ship monetization options that fit the current stack (Next.js + Firebase + Stripe).

## Low‑Lift Options

- Tips / Donations
  - One‑off tips on posts and profiles with Apple Pay/Google Pay via Stripe.
  - Minimal data model: `tips/{tipId}` referencing `userId` (creator) and `payerId`.
  - Add a “Tip” button on Post and Profile; optional message.

- Creator Subscriptions
  - Monthly tiers for exclusive posts, early access, badges.
  - Use Stripe Checkout + Customer Portal; Stripe Connect (Standard) for payouts.
  - Gate content with a `memberships/{creatorId}` read for current user.

- Paid Boosts (Promote a Post)
  - Users pay to boost reach (placement in “Featured” slots or feed priority).
  - Minimal settings: duration (24–72h) and category targeting.
  - Simple moderation queue; clear “Promoted” label.

- Sponsored Posts (Manual Ops)
  - Allow staff to mark a post as `sponsored: true` with a sponsor name/link.
  - Sell via manual IO (invoice) initially; track performance (views/clicks).
  - Add disclosures and UTM parameters.

- Affiliate Links
  - Auto‑monetize outbound product links for rev share.
  - Add an allowlist and disclosure; inject IDs/UTMs server‑side.

- Digital Goods (Simple)
  - Sell presets, sample packs, wallpapers, behind‑the‑scenes bundles.
  - Delivery via Firebase Storage signed URLs; purchases in Firestore.
  - Basic license notice and download limits.

## Nice‑To‑Have (Medium Effort)

- PPV Livestreams / VOD: ticketed room with replay window.
- Courses / Workshops / Mentorship: scheduled or on‑demand.
- Jobs / Gigs Board: paid postings; premium talent profiles.
- Marketplace Fees: take a fee on services (mixing/design) or resale.
- UGC Licensing: brands license creator content with rev share.
- Pro Tools / Insights: analytics for creators/brands.
- Partner API Access: paid feed/highlights API.
- Limited Digital Collectibles: non‑crypto drops tied to moments.

## MVP Recommendation (Next 1–2 Sprints)

1. Tips/Donations (Stripe)

- Add “Tip” CTA on posts/profiles → Stripe Checkout (one‑off).
- Firestore: `tips` collection; basic creator dashboards.

2. Creator Subscriptions (Stripe + Connect Standard)

- Tiered monthly plans; gating for posts.
- Customer Portal for self‑service cancels/updates.

3. Paid Boosts

- Promote post with 24–72h placement; flagged as Promoted.
- Simple backoffice review + throttle.

4. Sponsored Posts (Manual CMS flag)

- `sponsored: true`, `sponsorName`, `sponsorUrl`, UTM enforcement.
- Manual sales ops; weekly roll‑up.

## Compliance, UX, and Ops

- Labeling: “Promoted”/“Sponsored” badges and disclosures.
- Payouts/Tax: Stripe Connect (Standard) for creator payouts; consider Stripe Tax.
- Moderation: queue for promoted/sponsored content; rate limits on boosts.
- Refunds/Chargebacks: clear policy, minimal dispute evidence capture.
- Analytics: track impressions, clicks, conversion for sponsors/boosts.

---

If you want, we can turn the MVP items into user stories and an implementation checklist (DB collections, UI changes, and Stripe objects).
