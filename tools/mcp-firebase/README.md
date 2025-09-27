# RAGESTATE Firebase MCP Server

This directory contains a lightweight Express server that acts as a Model Context Protocol (MCP) provider for Firebase. It exposes a structured, secure, and observable set of tools for AI agents to interact with the RAGESTATE Firebase project.

## Why?

- **Security**: Prevents AI tools from needing direct, high-privilege access to the Firebase Admin SDK or production credentials. The server runs with a least-privilege service account.
- **Stability**: Provides a versioned, stable API contract (`/tools/:toolName`). If the underlying Firebase logic changes, the tool's interface can remain the same.
- **Observability**: All tool invocations can be logged, timed, and audited.
- **Guardrails**: Implements input validation (with `zod`), `dryRun` flags for mutations, and path allow-listing to prevent accidental or malicious operations.

## Setup

1.  **Install Dependencies**:

    ```bash
    npm --prefix tools/mcp-firebase install
    ```

2.  **Create Service Account**:
    - Go to the GCP Console for your `ragestate-app` project.
    - Navigate to `IAM & Admin` > `Service Accounts`.
    - Create a new service account (e.g., `ragestate-mcp-server`).
    - Grant it the following minimal roles for read-only access:
      - `Firebase Viewer`
      - `Cloud Datastore User` (provides Firestore read access)
    - Create a JSON key for this service account and download it.

- Place the key in a new hidden directory at the repository root: `.secrets/firebase-mcp-sa.json`.
- **Important**: Ensure `.secrets/` is in `.gitignore` (do **not** commit the JSON key).

3.  **Configure Environment**:
    - Create a `.env` file in the `tools/mcp-firebase` directory.
    - Add the following variables:

```env
# Path to your service account key (relative to this README location)
GOOGLE_APPLICATION_CREDENTIALS=../../.secrets/firebase-mcp-sa.json

# Your Firebase Project ID
GCP_PROJECT=ragestate-app

# Secret key required in 'x-mcp-api-key' header for all tool calls (except optional public health)
MCP_API_KEY=your-super-secret-key

# (Optional) Allow unauthenticated GET /health (set to any non-empty value, e.g. "1")
MCP_PUBLIC_HEALTH=1
```

## Running the Server

- **Development (with auto-reload)**:

  ```bash
  npm --prefix tools/mcp-firebase run dev
  ```

  The server will start on `http://localhost:8765`.

- **Production**:

  ```bash
  npm --prefix tools/mcp-firebase start
  ```

- **With Firestore Emulator**:
  1.  Start the emulator: `firebase emulators:start --only firestore`
  2.  Set the environment variable before starting the server:
      `bash
export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
npm --prefix tools/mcp-firebase run dev
`
      When the emulator is detected, the server will not use the service account credentials.

## Available Tools

The server exposes tools via POST requests to `/tools/:toolName`.

### `getFirestoreDoc`

Retrieves a single document from Firestore.

- **Endpoint**: `POST /tools/getFirestoreDoc`
- **Body**:
  ```json
  {
    "path": "users/some-user-id"
  }
  ```
- **Success Response**:
  ```json
  {
    "result": {
      "exists": true,
      "data": { "field": "value" }
    }
  }
  ```

### `listCollections`

Lists the root collections or sub-collections of a document.

- **Endpoint**: `POST /tools/listCollections`
- **Body (for root collections)**:
  ```json
  {}
  ```
- **Body (for sub-collections)**:
  ```json
  {
    "path": "users/some-user-id"
  }
  ```
- **Success Response**:
  ```json
  {
    "result": ["notifications", "devices", "settings"]
  }
  ```

### `queryCollection`

Performs a constrained query against a Firestore collection with an operator allow‑list and limit clamp.

- **Endpoint**: `POST /tools/queryCollection`
- **Body** (minimal):
  ```json
  {
    "collection": "events",
    "limit": 5
  }
  ```
- **Body** (with filters):
  ```json
  {
    "collection": "events",
    "filters": [
      { "field": "active", "op": "==", "value": true },
      { "field": "price", "op": "<=", "value": 20 }
    ],
    "orderBy": { "field": "dateTime", "direction": "desc" },
    "limit": 10
  }
  ```
- **Success Response** (enveloped – see below):
  ```json
  {
    "requestId": "ab12cd34ef56",
    "ok": true,
    "tool": "queryCollection",
    "elapsedMs": 42,
    "result": {
      "count": 2,
      "docs": [
        {
          "id": "...",
          "data": {
            /* fields */
          }
        }
      ]
    }
  }
  ```

## Response Envelope & Conventions

All tool responses (success or error) follow a standardized envelope so downstream AI agents can reliably parse metadata:

Success:

```json
{
  "requestId": "<short-hex>",
  "ok": true,
  "tool": "queryCollection",
  "elapsedMs": 123,
  "result": {
    /* tool specific payload */
  },
  "truncated": false
}
```

Error:

```json
{
  "requestId": "<short-hex>",
  "ok": false,
  "tool": "queryCollection",
  "elapsedMs": 2,
  "error": "Human readable message",
  "code": "invalid_input",
  "status": 400
}
```

Fields:

- `requestId`: Short, unique per call (logged for correlation).
- `ok`: Boolean success flag.
- `tool`: Tool name invoked.
- `elapsedMs`: Milliseconds measured from just before handler execution to just after (excludes async log write).
- `result`: Tool output (absent on error).
- `error`: Message string (errors only) – never includes secrets.
- `code`: Stable machine code (errors only) – see Error Codes below.
- `status`: HTTP status actually sent (errors only).
- `truncated`: Present when output was size‑clamped (boolean true) – omitted or false otherwise.

### Timestamp Normalization

Firestore `Timestamp` objects are converted into ISO 8601 strings so the payload is JSON‑native and deterministic.

### Size Clamping

Large `result` payloads are capped (current clamp ~50KB serialized). When clamped:

- `truncated: true` is added to the envelope.
- Data beyond the clamp boundary is omitted – design downstream logic to request narrower queries instead of relying on large pages.

### Redaction

Potentially sensitive parameter keys (`key`, `apiKey`, `password`, `secret`, `token`) are replaced with `"[REDACTED]"` in logs; values are still used internally for the handler logic.

## Error Codes

| Code             | Meaning                                              | Typical HTTP Status |
| ---------------- | ---------------------------------------------------- | ------------------- |
| `invalid_input`  | Zod validation failed / malformed body               | 400                 |
| `unauthorized`   | Missing / invalid `x-mcp-api-key` (or tool disabled) | 401 / 403           |
| `tool_disabled`  | Tool present but toggled off via config              | 403                 |
| `internal_error` | Unexpected exception (stack not exposed)             | 500                 |

## Tool Toggles

You can enable/disable tools without redeploying by creating a document:
`mcpConfig/tools` (collection: `mcpConfig`, doc id: `tools`)

Example doc data:

```json
{
  "getFirestoreDoc": true,
  "listCollections": true,
  "queryCollection": true
}
```

If a key is absent the default is considered `true` (enabled). Setting to `false` returns an error envelope with `code: "tool_disabled"`.

The server caches this doc briefly; allow up to ~30s for changes to propagate.

## Logging & Audit Trail

Each invocation attempts a best‑effort write to Firestore collection `mcpToolCalls` using `requestId` as the document id. Logged fields (subset – may evolve):

```json
{
  "requestId": "ab12cd34ef56",
  "tool": "queryCollection",
  "ts": "2025-09-26T18:34:12.345Z",
  "elapsedMs": 42,
  "ok": true,
  "truncated": false,
  "params": { "collection": "events", "limit": 5 },
  "ipHash": "3f9a1c7d...",
  "error": null
}
```

`ipHash` is a SHA‑256 of the remote address (truncated) to support coarse anomaly detection while avoiding storing raw IP addresses.

Failures to log never fail the tool call (non‑blocking).

## Security & Auth

- All tool POST requests must include header: `x-mcp-api-key: <MCP_API_KEY>`.
- Keep the service account JSON in `.secrets/`; never embed its contents directly in `.env`.
- Optional unauthenticated `GET /health` when `MCP_PUBLIC_HEALTH` is set (otherwise requires API key like other routes).

## Health & Root Endpoints

- `GET /` – Returns envelope with a friendly message and the list of currently registered tool names (honors tool toggles).
- `GET /health` – Returns `{ status: "ok", project: "<id>", tools: n }` (public only if allowed).

## Example Usage (curl)

Root:

```bash
curl -s -H "x-mcp-api-key: $MCP_API_KEY" http://localhost:8765/ | jq
```

Get a document:

```bash
curl -s -X POST http://localhost:8765/tools/getFirestoreDoc \
  -H 'Content-Type: application/json' \
  -H "x-mcp-api-key: $MCP_API_KEY" \
  -d '{"path":"events/SomeEventId"}' | jq
```

List root collections:

```bash
curl -s -X POST http://localhost:8765/tools/listCollections \
  -H 'Content-Type: application/json' \
  -H "x-mcp-api-key: $MCP_API_KEY" \
  -d '{}' | jq
```

Query collection (filtered):

```bash
curl -s -X POST http://localhost:8765/tools/queryCollection \
  -H 'Content-Type: application/json' \
  -H "x-mcp-api-key: $MCP_API_KEY" \
  -d '{"collection":"events","filters":[{"field":"active","op":"==","value":true}],"limit":3}' | jq
```

## Roadmap / Next Ideas

See `docs/mcp-roadmap-mvp.md` (completed items reflected here) and `docs/mcp-roadmap.md` for planned future tools such as schema inference, file-chunk reading, and patch proposal workflows.

---

If you add a new tool, remember to:

1. Define a Zod schema.
2. Implement the handler.
3. Register it in `TOOLS`.
4. (Optional) Add a toggle entry in `mcpConfig/tools` if you want to default-disable it.
5. Update this README section with usage examples.

## Adding New Tools

1.  **Define a Zod Schema**: Create a schema in `server.js` for input validation.
2.  **Write the Handler Function**: Create an `async` function that takes the parsed parameters and interacts with the Firebase Admin SDK.
3.  **Register the Tool**: Add the schema, handler, and a description to the `TOOLS` object in `server.js`.
