# MCP Server – Slim MVP Roadmap

This document distills the broader roadmap into ONLY what we need to ship a **useful + observable + safe** MCP baseline. Everything else (schema inference, code reading, mutations, rate limiting) is explicitly deferred.

## Current Minimal Capabilities

- Tools: `getFirestoreDoc`, `listCollections`, `queryCollection` (read-only).
- Auth: Single API key header (`x-mcp-api-key`).
- Firebase Admin: Service account initialized correctly.

## MVP Objective

Provide a dependable read-only context interface for LLM assistance **with traceability and predictable responses**, so we can confidently expand later.

## Out of Scope (Deferred)

- Any write/mutation tools
- Codebase file access (`readFileChunk`, diff, patch)
- Schema inference (`describeSchema`)
- Rate limiting & quotas
- Key rotation automation
- Execution/test runners
- Advanced security policies / redaction heuristics

## MVP Deliverables

| #   | Deliverable                    | Description                                                                                                    | Acceptance                                                             |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Standard response envelope     | Wrap all tool responses in `{ requestId, ok, tool, elapsedMs, result                                           | error }`                                                               | All endpoints updated; manual curl shows envelope |
| 2   | Request ID generation          | Middleware assigns nanoid/uuid per request                                                                     | Each response includes unique `requestId`                              |
| 3   | Structured logging (Firestore) | Collection: `mcpToolCalls/{requestId}` with `{ ts, tool, success, elapsedMs, errorCode?, paramsRedacted }`     | Log doc created for 100% successful calls (best-effort on failures)    |
| 4   | Param redaction                | Shallow redaction of keys containing: `token`, `auth`, `apiKey`                                                | Logs store `***redacted***` placeholders                               |
| 5   | Timestamp normalization        | Convert Firestore `Timestamp` values → ISO strings recursively                                                 | Query returns ISO date strings instead of `{ _seconds, _nanoseconds }` |
| 6   | Payload size clamp             | If serialized `result` > 40KB (constant MAX_RESULT_BYTES), truncate docs & attach `truncated`, `originalCount` | Trigger test with large synthetic data                                 |
| 7   | Tool enable toggle             | Firestore: single doc `mcpConfig/tools` with boolean or `{ enabled: false }` per key (default true)            | Setting key false returns 403 with `TOOL_DISABLED`                     |
| 8   | Public health (optional)       | Allow `/health` without API key (if env `MCP_PUBLIC_HEALTH` in `true,1,yes,on`)                                | Curl without header returns ok=true                                    |
| 9   | Basic README update            | New section: “MVP Observability Layer”                                                                         | README diff merged                                                     |

## Data Model Additions

```
mcpToolCalls/{requestId} {
  ts: Timestamp,
  tool: string,
  success: boolean,
  elapsedMs: number,
  ipHash: string|null,
  paramsRedacted: object,
  errorCode?: string,
  sizeBytes: number,
  truncated?: boolean
}

// Tool toggles consolidated in one document example:
mcpConfig/tools {
  getFirestoreDoc: true,
  listCollections: true,
  queryCollection: { enabled: false }
}
```

## Implementation Order (Fast Path)

1. Middleware: request timer + requestId + tool toggle check.
2. Response utilities (`utils/response.js`): `wrapSuccess`, `wrapError`, `normalizeTimestamps`, `redactParams`, `enforceSizeClamp`.
3. Integrate envelope in existing POST tool handler + GET root.
4. Logging Firestore write (non-blocking best-effort: wrap in try/catch; ignore on failure).
5. Timestamp normalization inside tool handler just before `wrapSuccess`.
6. Tool toggle resolution (cache in-memory 30s for fewer reads).
7. Optional: public health toggle.
8. README update.

## Redaction Rules (MVP Simple)

- If key name lowercased contains any of: `token`, `auth`, `apikey`, `password`, `secret` replace value with `"***redacted***"`.
- Depth-limited (<=2) recursion; deeper objects replaced with `"[MaxDepth]"`.

## Error Envelope Examples

```
{ "requestId":"r1a2b3", "ok":false, "tool":"queryCollection", "elapsedMs":12, "error": { "code":"VALIDATION_FAILED", "message":"Invalid input", "details": [...] } }
```

## Truncation Example

```
{
  "requestId":"abc123",
  "ok": true,
  "tool":"queryCollection",
  "elapsedMs": 34,
  "result": {
    "count": 100,
    "docs": [ ... first 25 ... ],
    "truncated": true,
    "originalCount": 100
  }
}
```

## Success Criteria

- All three tools return standardized envelopes.
- Manual disable of a tool via Firestore prevents its execution instantly (or within cache TTL).
- Log size overhead acceptable (P95 added latency < 50ms locally).
- Redaction verified via test payload containing `authToken`.

## Quick Manual Validation Script (Pseudo)

1. Call `queryCollection` normal.
2. Disable tool doc in Firestore.
3. Call again → expect 403.
4. Re-enable → succeeds.
5. Inspect Firestore `mcpToolCalls` doc matches response `requestId`.

## Post-MVP Backlog (Ranked)

1. Schema inference tool.
2. Code file read tool.
3. Rate limiting.
4. Patch proposal flow.
5. Key rotation automation.

## Cut Scope Rationale

We exclude anything that introduces write complexity, significant security policy surface, or model-driven code mutation until auditability & response hygiene are guaranteed.

## Summary

This MVP slice delivers traceability + safety wrappers around existing read tools with minimal new complexity. Ship this before expanding capability so future features inherit consistent envelopes, logging, and toggles.
