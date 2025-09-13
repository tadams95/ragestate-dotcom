# AI Try‑On Feature — Design Spec and Implementation Plan

Owner: Commerce/Feed Team  
Date: 2025‑09‑13  
Status: Draft (scoping)

## Goals

- Let users preview how a garment looks on them by uploading a photo and generating a try‑on image.
- Integrate cleanly with existing Next.js App Router, Firebase (Auth/Firestore/Storage), and Tailwind UI.
- Start with a single frontal product image try‑on and scale to more SKUs and models later.

## Non‑Goals

- Real‑time AR try‑on or video.
- Full body pose transfer beyond a single front‑facing photo in v1.

## References

- Vercel v0 demo storefront (UI/flow reference): `tadams95/v0-ai-storefront-demo`  
  Adapt: modal UX, product detail entry point, polling/status updates, skeleton/loading.
- Candidate providers/models: Replicate (e.g., TryOnDiffusion), Hugging Face Inference Endpoints, or SaaS (Vue.ai, Zyler, PICTOFiT). Start with Replicate or HF Endpoint for speed.

---

## User Journeys

1. Product page → “Try On with AI” → upload or take a selfie → generate → preview → save/share (and optionally add‑to‑cart).
2. Returning user → see prior try‑ons in account history (optional v2).

## UX/Flows

- Entry point: `src/app/shop/[slug]/ProductDetailClient.js`
  - Add a primary/secondary button: “Try On with AI”.
  - Opens modal/sheet with:
    - Image uploader (accept image/\*). Max 8 MB, JPG/PNG/HEIC; we’ll transcode to JPG.
    - Consent text (usage, retention, deletion).
    - Generate button with progress state.
    - Result preview with download/save and “Use another photo”.
- Empty states & errors: invalid file, over size limit, generation failed, rate‑limit reached.
- Accessibility: focus trap, keyboard close, alt text, color contrast.

## Architecture

- Client (modal) → Next.js API (`/api/tryon`) → Provider → result URL → client polls `/api/tryon/[jobId]` until `status=completed|failed`.
- Store job metadata in Firestore for observability and retries.
- Store user input image and output in Firebase Storage with short TTL. Optionally stream directly to provider to avoid persistent storage.

### Data Model

Firestore collection: `tryonJobs/{jobId}`

- `userId` (string | null for guest)
- `productId` (string)
- `provider` (string)
- `modelVersion` (string)
- `status` ('queued' | 'running' | 'completed' | 'failed' | 'canceled')
- `inputImagePath` (string, gs://...)
- `garmentImageUrl` (string)
- `resultUrl` (string | null)
- `error` (string | null)
- `costCents` (number | null)
- `createdAt` (Timestamp)
- `startedAt` (Timestamp | null)
- `completedAt` (Timestamp | null)
- `usernameLower` (string | null)

Storage layout:

- `tryon/{userIdOrAnon}/{jobId}/input.jpg`
- `tryon/{userIdOrAnon}/{jobId}/result.jpg`

Retention: default 24–72h for both input and output (configurable; delete on request).

### API Surface (App Router)

- `POST /api/tryon` — Create job
  - FormData: `userImage` (File), `garmentImage` (URL or File), `productId` (string)
  - Returns: `{ jobId, status: 'queued' }`
- `GET /api/tryon/[jobId]` — Get job status
  - Returns: `{ jobId, status, resultUrl?, error? }`
- `POST /api/tryon/webhook` — Optional provider webhook for async completion (if provider supports callbacks). Updates Firestore and Storage.

Runtime: Node.js (most providers require standard Node SDK; Edge supported later if possible).

### Provider Abstraction

`src/utils/tryon/providers/`

- `replicate.js` — calls a selected try‑on model version on Replicate
- `hfEndpoint.js` — calls a private HF Inference Endpoint
- `index.js` — choose provider based on env/config

Environment:

- `TRYON_PROVIDER=replicate|hf`
- `REPLICATE_API_TOKEN`
- `HF_ENDPOINT_URL`, `HF_API_TOKEN`
- `TRYON_MAX_IMAGE_MB=8`
- `TRYON_TTL_HOURS=24`
- `TRYON_RATE_LIMIT_PER_DAY=5` (example default)

### Flow Details

1. Client uploads image to API (multipart). We:
   - Validate MIME, size, pixel count; strip EXIF; transcode to JPG (sharp).
   - Option A (simple): temporarily store in memory and stream to provider.
   - Option B (traceable): upload to Firebase Storage, store path in job.
2. Create Firestore job doc `status='queued'` and return `jobId`.
3. Fire off background work (in the same API request for v1) to call provider and update job:
   - `status='running'` → provider call → on success store `resultUrl` (provider URL or upload to Storage) → `status='completed'`.
   - On error → `status='failed'` + error message.
4. Client polls `/api/tryon/[jobId]` ~1–2s backoff until completion. Optionally switch to webhook‑first flow later.

### Security & Privacy

- Strict file validation and size limit. Strip EXIF metadata. Virus scan optional.
- Signed URLs for any public assets; otherwise require auth to read.
- Short retention TTL; scheduled cleanup job to purge old inputs/outputs.
- Document user consent in UI; provide “Delete my try‑on” option (v2).
- Rate limiting: per user/IP/day. Consider Upstash Redis or Firestore counters with backoff.
- Abuse: reCAPTCHA (Enterprise or Turnstile) gating generation for unauthenticated users.

### Observability & Metrics

- Client events via `track(...)`:
  - `tryon_open`, `tryon_upload`, `tryon_generate_click`, `tryon_success`, `tryon_failure`, `tryon_rate_limited`.
- Server logs: provider latency, success rate, error buckets, cost per job.
- Firestore job docs serve as a ledger for support and analytics.

### Performance

- Typical latency: 15–60s per job depending on provider. Show skeleton and optimistic UI.
- Concurrency: cap concurrent jobs per user to 1–2.
- Image preprocessing (resize max 1536px longer side) to cut egress and inference cost.

---

## Implementation Plan

### Milestones

1. Scaffold UI + API stubs (0.5–1d)
   - Button and modal in `ProductDetailClient.js` with basic uploader and state.
   - API: `POST /api/tryon` and `GET /api/tryon/[jobId]` returning stubbed data.
2. Provider integration (0.5–1.5d)
   - Add provider module (Replicate first). Env‑driven selection.
   - Wire basic happy path end‑to‑end.
3. Storage + Jobs (0.5d)
   - Firestore `tryonJobs` and Storage write for inputs/outputs.
   - Polling status endpoint.
4. Rate limits + Consent (0.5d)
   - Per‑user/IP limits, recaptcha for guests, consent copy and checkbox.
5. QA + Polish (0.5d)
   - Error states, accessibility, analytics events, image quality checks.

### Acceptance Criteria

- From product page, user can upload a selfie and receive a generated try‑on image for supported SKUs.
- Handles error, cancellation, and retry gracefully.
- Enforces file size/type checks and rate limits.
- Jobs persisted in Firestore; outputs available via signed URL or provider URL.
- Metrics emitted client + server; costs estimable per day.

### Proposed Files/Changes

- UI
  - `src/app/shop/[slug]/ProductDetailClient.js`: add try‑on modal + state machine.
  - `src/app/components/TryOnModal.jsx` (optional extraction for reuse).
- API
  - `src/app/api/tryon/route.js`: POST create job and start generation.
  - `src/app/api/tryon/[jobId]/route.js`: GET status.
  - `src/app/api/tryon/webhook/route.js`: POST webhook (optional).
- Utils
  - `src/utils/tryon/providers/index.js`
  - `src/utils/tryon/providers/replicate.js`
  - `src/utils/tryon/image.js` (validation, resize, exif stripping)
- Data
  - Firestore security rules update to protect `tryonJobs` and Storage paths.

### Minimal API Skeletons

`src/app/api/tryon/route.js`

```js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const form = await req.formData();
    const userImage = form.get('userImage');
    const productId = form.get('productId');
    const garmentImage = form.get('garmentImage');

    // TODO: validate inputs, rate limit, create Firestore job
    // TODO: call provider in background and update job

    return NextResponse.json({ jobId: 'stub', status: 'queued' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Try-on failed' }, { status: 500 });
  }
}
```

`src/app/api/tryon/[jobId]/route.js`

```js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(_req, { params }) {
  const { jobId } = params;
  // TODO: read Firestore job
  return NextResponse.json({ jobId, status: 'queued' });
}
```

### Env & Config

Add to `.env.local` (examples):

```
TRYON_PROVIDER=replicate
REPLICATE_API_TOKEN=...
HF_ENDPOINT_URL=...
HF_API_TOKEN=...
TRYON_MAX_IMAGE_MB=8
TRYON_TTL_HOURS=24
TRYON_RATE_LIMIT_PER_DAY=5
```

### Cost & Latency Notes

- Replicate: ~$0.02–$0.12 per image depending on model/instance type; ~20–60s.
- HF Endpoint: pay for provisioned instance; more predictable latency, higher idle cost.
- SaaS: per‑image pricing; shorter integration, vendor lock‑in.

### Risk & Mitigation

- High latency → clear progress UI and background polling; allow user to navigate while job runs (v2: notifications).
- Content safety → restrict to apparel SKUs; validate uploads; add moderation if needed.
- Provider drift → encapsulate calls in provider adapters; version pin.

### Rollout

- Feature flag via env or Firestore remote config: `feature_tryon=true`.
- Soft launch on a subset of SKUs (transparent front PNG preferred) and to logged‑in users first.
- Collect feedback, costs, and conversion impact before broad enablement.

### Future Extensions

- Body segmentation and better pose control; multiple angles.
- Batch try‑on across variants; carousel compare.
- Share to feed; allow comments, structured UGC.
- Account history of try‑ons with delete controls.

---

## Task Checklist

- [ ] UI: Try‑On button + modal skeleton
- [ ] API: POST `/api/tryon` (stubbed)
- [ ] API: GET `/api/tryon/[jobId]` (stubbed)
- [ ] Provider adapter (Replicate) + env wiring
- [ ] Firestore `tryonJobs` create/update
- [ ] Storage upload + signed URLs
- [ ] Rate limiting + consent copy
- [ ] Analytics events via `track(...)`
- [ ] Error states and accessibility
- [ ] Cleanup job for TTL

---

## Open Questions

- Provider choice for v1? (Replicate vs HF vs SaaS)
- Do we require login to generate? If not, guest rate limits + captcha?
- Asset readiness: Do we have front‑facing garment PNGs with good alpha mattes?
- Retention policy and privacy page copy approval.
