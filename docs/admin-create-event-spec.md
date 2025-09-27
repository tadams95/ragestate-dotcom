# Admin Create Event Page – Specification

Status: Draft (initial spec)
Owner: Platform / Admin UX
Last Updated: 2025-09-27

## 1. Goal

Provide an internal (admin-only) web interface that allows the executive / ops team to create and manage event documents in Firestore without manual console edits or ad-hoc scripts. The tool must streamline image upload, validation, and inventory (ticket quantity) setup while enforcing data quality and security constraints.

## 2. Scope

IN SCOPE:

- Create new `events/{eventId}` documents.
- Upload a cover image to Firebase Storage and store its public URL (`imgURL`).
- Set core event metadata required by the consumer UI (`EventDetails` component) and ticketing flow.
- Validation + preview before commit.
- Optional “Save as Draft” (inactive event not publicly listed yet).

OUT OF SCOPE (Future Enhancements):

- Editing existing events (will be a follow-up: “Admin Edit Event”).
- Bulk import / CSV.
- Multi-image gallery or media management beyond single hero image.
- Automated social promotion or feed posting.
- Advanced access windows / tiered pricing / discount codes.

## 3. Target Users & Access Control

Audience: Internal admins (executive, operations). Not exposed to end users.

Authorization Strategy:

- Require authenticated Firebase user AND either custom claim `admin=true` OR membership in `adminUsers/{uid}` per existing rules.
- Page route gated in UI (`/admin/events/new`). On unauthorized access: redirect to `/` or dedicated 403 page.

## 4. Data Model (Event Document)

Existing / observed fields (from `describeSchema` + current UI):

| Field         | Type                | Required     | Description                                                                                     |
| ------------- | ------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| `name`        | string              | Yes          | Display name (unique per active event; will also derive `id`/slug).                             |
| `description` | string (multi)      | Yes          | Markdown-safe or plain text; preserves newlines.                                                |
| `imgURL`      | string (URL)        | Yes          | Firebase Storage public URL for hero image.                                                     |
| `price`       | number              | Yes          | Ticket price in USD (whole dollars or decimals). Normalize to number.                           |
| `age`         | number              | Optional     | Minimum age requirement (e.g., 18 or 21).                                                       |
| `dateTime`    | Firestore Timestamp | Yes          | Event start (single start time).                                                                |
| `location`    | string              | Yes          | Free-form venue / address string.                                                               |
| `quantity`    | number              | Yes          | Remaining inventory (initial total). Decrements via ticket purchase flow.                       |
| `capacity`    | number              | Optional     | (If different from `quantity` for capacity vs remaining). If absent, UI may omit capacity line. |
| `isDigital`   | boolean             | Optional     | If event is digital/virtual; toggles UI treatment. Defaults false.                              |
| `active`      | boolean             | Yes          | Controls visibility (listed & purchasable). Draft if false.                                     |
| `category`    | string              | Optional     | Tag / classification (e.g., “Launch”, “Afterparty”).                                            |
| `guests`      | array<string>       | Optional     | Guest performer IDs or handles (for future expansion).                                          |
| `createdAt`   | Timestamp           | Yes (server) | Set server-side on creation.                                                                    |
| `updatedAt`   | Timestamp           | Yes (server) | Mirrors last modification.                                                                      |
| `slug`        | string              | Yes          | URL-safe unique slug (derived from name + short random suffix if needed).                       |

Derived / Not Directly Editable:

- `slug` auto-generated.
- `createdAt` / `updatedAt` set by server (Cloud Function or trusted API route) to avoid client clock skew.
- Future: `searchKeywords` for indexing (prefix grams) – not part of v1.

## 5. Form Fields & UX Behavior

| UI Control          | Underlying Field | Component / Notes                                              | Validation                                                                          |
| ------------------- | ---------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Event Name          | `name`           | Text input (debounced uniqueness check)                        | 4–80 chars; must differ (case-insensitive) from existing active events.             |
| Description         | `description`    | Multiline textarea / markdown-safe; live character count       | 20–5000 chars. Preserve newlines.                                                   |
| Hero Image          | `imgURL`         | File input -> preview -> upload button                         | Accept: `.png,.jpg,.jpeg,.webp` ≤ 5MB. Enforce aspect ratio warning (<1:1 or >3:1). |
| Price (USD)         | `price`          | Numeric input (step 0.01)                                      | 0 ≤ price ≤ 1000. Round to 2 decimals.                                              |
| Minimum Age         | `age`            | Number select or free entry (18, 21)                           | Optional; if set must be ≥ 0 and < 120.                                             |
| Date & Time         | `dateTime`       | Combined datetime picker (local -> converted to UTC Timestamp) | Required; cannot be in the past (allow override with admin confirm?).               |
| Location            | `location`       | Text input with Google Maps link preview                       | 4–140 chars.                                                                        |
| Inventory (Initial) | `quantity`       | Number input                                                   | Integer 0–50,000.                                                                   |
| Capacity (Display)  | `capacity`       | Number input                                                   | Optional; if provided ≥ quantity (warn if lower).                                   |
| Digital Event?      | `isDigital`      | Checkbox toggle                                                | Default false. If true, location prompt adjusts (“Virtual / Link TBD”).             |
| Category            | `category`       | Text or select (predefined categories)                         | Optional; max 40 chars.                                                             |
| Active (Publish)    | `active`         | Switch                                                         | Default false → Save as draft; true → published on create.                          |
| Guests / Performers | `guests`         | Tag input (string array)                                       | Optional; each tag ≤ 40 chars; max 20 entries.                                      |

### Image Upload Flow

1. Admin selects file.
2. Client validates size & type locally.
3. Optional: show preview (object URL) + dimensions.
4. On “Upload Image” or form submit: client uploads to Storage path `events/<slug>/hero.<ext>` using Firebase Storage SDK.
5. Retrieve download URL -> set `imgURL` hidden field.
6. If form submission fails after upload, user can reuse uploaded image (avoid orphan re-uploads).

### Slug Generation

Algorithm:

1. Base slug = kebab-case(name) trimming stopwords + condense hyphens.
2. Check existence of `events/{slug}`.
3. If exists: append `-<shortRandom>` (5–6 alphanum) and recheck.
4. Write final `slug` field.

## 6. Submission & Write Path

Preferred pattern: Use a Next.js API route (e.g., `POST /api/admin/events/create`) that:

1. Verifies Firebase ID token from caller (admin check).
2. Validates payload with a server-side schema (zod) mirroring client constraints.
3. Recomputes / sanitizes: `slug`, `price` (number), `name` (trim), `active` default.
4. Ensures uniqueness: query `events` for existing `slug` or active `name` conflict.
5. Writes doc in a transaction:
   - `events/{slug}` = payload + server fields (`createdAt`, `updatedAt`).
6. Returns created document summary (excluding large description if > size threshold?).

Alternative (Fast Path): Client writes directly with Admin privileges (NOT recommended) — rely on Firestore rules. Chosen approach above improves validation & auditing.

## 7. Security & Rules Considerations

Firestore Rules (add / confirm):

- Only admins can create `events/{id}`.
- Prevent overwriting an existing event unless separate edit path used.
- Enforce immutable `createdAt` once set; allow updates to `updatedAt` via server time only.
- Possibly block client-supplied `imgURL` domains except firebase storage host pattern to reduce malicious injection.

Storage Rules:

- Allow admins to write under `events/<slug>/`.
- Optional: delete orphan images if event creation fails (background cleanup script).

## 8. Validation Summary (Server-Side)

| Field       | Rule                                 | Reject Reason Code           |
| ----------- | ------------------------------------ | ---------------------------- |
| name        | Uniqueness among active; length 4–80 | NAME_CONFLICT / NAME_INVALID |
| description | 20–5000 chars                        | DESCRIPTION_INVALID          |
| price       | Number; 0–1000; finite               | PRICE_INVALID                |
| age         | Integer or null; 0–119               | AGE_INVALID                  |
| dateTime    | Future (>= now - 5m grace)           | DATETIME_INVALID             |
| location    | 4–140 chars                          | LOCATION_INVALID             |
| quantity    | Int 0–50000                          | QUANTITY_INVALID             |
| capacity    | If set: ≥ quantity                   | CAPACITY_INVALID             |
| category    | ≤ 40 chars                           | CATEGORY_INVALID             |
| guests      | Array len ≤ 20; each ≤ 40 chars      | GUESTS_INVALID               |
| imgURL      | Must start with allowed host(s)      | IMG_URL_INVALID              |

## 9. Draft vs Published Flow

Draft (active = false):

- Not shown in public listings / search.
- Admin list (future) will show status pill.
- Can still be fully previewed by direct slug URL if rules permit admin access only.

Published (active = true):

- Immediately visible and purchasable (inventory permitting).
- Consider 1–2 minute caching delay if we later add edge caching.

## 10. UX States & Errors

States:

- Idle (empty form)
- Image uploading (progress bar/spinner)
- Validating (on submit)
- Success (redirect to `/events/<slug>` with admin toast “Event created”)
- Error (field-level + global toast)

Error Presentation:

- Show first server error near top with code mapping to friendly copy.
- Field-level highlight for validation failures.
- Preserve entered values on error (do not clear form).

## 11. Edge Cases

- Duplicate submission (double click): Use submit lock + idempotent slug check.
- Upload succeeds, form fails: keep image; allow reuse (show ‘Use existing uploaded image’ option).
- Price set to text: coerce / parse; if NaN → validation error.
- Past date chosen: require confirm modal “Create anyway?” (optional v1; else strict reject).
- Zero quantity + active=true: warn prompt “Event will appear sold out immediately”. Allow confirm.
- Large description (> 10KB): warn but allow (still within limit). Consider compression if analytics ingest later.

## 12. Telemetry (Optional v1)

Log (Firestore `adminEventCreates/{id}` or analytics):

```
{
  uid, slug, name, ts, draft, sizeDesc: description.length, hasImage: boolean, durationMs
}
```

## 13. Accessibility

- All form inputs labeled; associate errors via `aria-describedby`.
- Color contrast: meet WCAG AA for buttons and text.
- Keyboard nav: Tab order logical; Enter submits.

## 14. Performance Considerations

- Lazy-load image when selected; no duplicate uploads.
- Keep client bundle lean: isolate admin page (dynamic import heavy libs if any).

## 15. Testing Strategy

Unit / Integration:

- Schema validation function tests (edge inputs).
- Slug generator tests (conflict resolution).
- API route test (happy path + each rejection reason).

Manual QA Checklist:

- Create draft → visible in Firestore with active=false.
- Publish event → appears on public events page.
- Duplicate name triggers conflict error.
- Image >5MB blocked client-side.
- Quantity 0 with active=true shows confirm or block behavior as designed.

## 16. Open Questions

| Question                                        | Decision Needed                                       |
| ----------------------------------------------- | ----------------------------------------------------- |
| Allow editing after creation in same flow?      | Likely separate edit page.                            |
| Support timezone selection?                     | Use local input -> store UTC; display in user locale. |
| Markdown support for description?               | If yes, sanitize & whitelist tags; else plain text.   |
| Should we auto-post to social feed when active? | Future automation (deferred).                         |

## 17. Acceptance Criteria

1. Admin with proper claim can navigate to `/admin/events/new` and see form.
2. Submitting valid data creates Firestore doc with all required fields + server timestamps.
3. Image is uploaded once and URL stored reliably.
4. Draft event (active=false) does not appear in public listings.
5. Published event (active=true) shows correctly in existing `EventDetails` UI.
6. Validation errors returned from API are surfaced inline without losing user-entered data.
7. Slug uniqueness enforced even under concurrent create attempts.
8. Non-admin user is blocked (redirect or 403) from page and API route.
9. All timestamps stored as Firestore `Timestamp` objects (not strings) server-side.
10. No PII or secrets logged in failure analytics.

## 18. Future Enhancements (Backlog)

- Multi-image gallery (carousel).
- Start + end times (duration) or multi-session events.
- Tiered ticket pricing (early bird vs general).
- Scheduled activation (publish at future timestamp).
- Soft delete / archival.
- Automatic feed post creation on publish.
- Category taxonomy management UI.

---

End of spec.

## 19. Implementation Checklist (Phased)

Phase 0 – Foundations / Utilities

- [x] Add `zod` dependency for schema validation.
- [x] Create server-side Firebase Admin singleton (`lib/server/firebaseAdmin.js`).
- [x] Create admin detection helper (`lib/server/isAdmin.js`).
- [x] Implement slug generation + uniqueness helper (`lib/admin/events/slug.js`).
- [x] Implement input validation + sanitization schema (`lib/admin/events/schema.js`).

Phase 1 – API Route

- [x] Scaffold `POST /api/admin/events/create` (`src/app/api/admin/events/create/route.js`).
- [x] Verify ID token, ensure admin (custom claim OR `adminUsers/{uid}` doc).
- [x] Parse + validate payload via zod schema.
- [x] Enforce active-name uniqueness (case-insensitive) among active events.
- [x] Generate unique slug (collision retries + transaction guard).
- [x] Transaction: set doc with `createdAt`, `updatedAt`, `slug`, `nameLower`.
- [x] Return success JSON (omit overly large description if ever > threshold – future optimization).
- [x] Map validation failures to spec error codes.

Phase 2 – Firestore & Storage Rules

- [x] Amend Firestore rules: only admins can create events; forbid client-changing `createdAt`; require `createdAt` & `updatedAt` server timestamps; constrain `imgURL` host (firebase storage domain) if feasible.
- [x] Amend Storage rules: admins can write under `events/<slug>/` path; optionally restrict file types & max size.

Phase 3 – Admin UI Page (`/admin/events/new`)

- [ ] Gate route client-side (redirect non-admins).
- [ ] Build form components (name, description, image upload, price, age, dateTime, location, quantity, capacity, isDigital, category, guests, active switch).
- [ ] Local validation mirror (fast feedback) + server fallback.
- [ ] Image upload flow (single upload, progress indicator, preview, error states, reuse on retry).
- [ ] Prevent double submit (loading state + disable submit).
- [ ] Inline + toast error presentation (map server error codes to friendly copy).

Phase 4 – Telemetry & QA

- [ ] Optional telemetry write (`adminEventCreates/{id}`) with duration & flags.
- [ ] Jest tests: slug util, schema validation edge cases, API route (happy path + each rejection code) using Firebase emulator.
- [ ] Manual QA checklist execution (draft visibility, publish visibility, conflict errors, quantity warnings, image size enforcement).

Phase 5 – Polish

- [ ] Accessibility audit (labels, aria-describedby, focus management on errors).
- [ ] Performance: ensure no large admin-only libs in main bundle (dynamic imports if needed).
- [ ] Documentation update (README admin section & this spec tick marks or changelog).

Stretch / Backlog (post-MVP)

- [ ] Past date override confirm modal.
- [ ] Zero quantity + active confirmation modal.
- [ ] Markdown description support with sanitization.
- [ ] Scheduled publish time.
- [ ] Social feed auto-post on publish.

Status Tracking: Keep real-time progress optionally in a lightweight separate file (`docs/admin-create-event-progress.md`) or convert checklist marks here during implementation.

---
