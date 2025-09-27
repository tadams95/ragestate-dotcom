import crypto from 'crypto';

// Max serialized JSON bytes for a result payload before truncation
export const MAX_RESULT_BYTES = 40000; // ~40KB

// Generate a request ID (simple nano substitute)
export function genRequestId() {
  return crypto.randomBytes(6).toString('hex'); // 12-char hex
}

// Shallow redaction (depth <= 2) of sensitive keys (expanded for consistency with README)
const SENSITIVE_KEYS = ['token', 'auth', 'apikey', 'password', 'secret'];

export function redactParams(obj, depth = 0) {
  if (!obj || typeof obj !== 'object') return obj;
  if (depth > 2) return '[MaxDepth]';
  if (Array.isArray(obj)) return obj.map((v) => redactParams(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
      out[k] = '***redacted***';
    } else if (v && typeof v === 'object') {
      out[k] = redactParams(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Firestore Timestamp normalization
export function normalizeTimestamps(value) {
  if (value == null) return value;
  if (isFirestoreTimestamp(value)) {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(normalizeTimestamps);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normalizeTimestamps(v);
    }
    return out;
  }
  return value;
}

function isFirestoreTimestamp(v) {
  // duck-typing for firebase-admin Timestamp
  return (
    v &&
    typeof v === 'object' &&
    typeof v.toDate === 'function' &&
    Object.prototype.hasOwnProperty.call(v, '_seconds')
  );
}

export function sizeClamp(result, maxBytes = MAX_RESULT_BYTES) {
  const json = JSON.stringify(result);
  if (Buffer.byteLength(json, 'utf8') <= maxBytes) {
    return { clamped: false, result };
  }
  // If result has docs array, truncate docs
  if (result && typeof result === 'object' && Array.isArray(result.docs)) {
    const originalCount = result.docs.length;
    const truncated = [...result.docs];
    while (
      truncated.length &&
      Buffer.byteLength(JSON.stringify({ ...result, docs: truncated }), 'utf8') > maxBytes
    ) {
      truncated.pop();
    }
    return {
      clamped: true,
      result: { ...result, docs: truncated, truncated: true, originalCount },
    };
  }
  // Fallback: replace with notice
  return {
    clamped: true,
    result: { truncated: true, notice: 'Payload exceeded size budget' },
  };
}

export function wrapSuccess({ requestId, tool, startedAt, payload }) {
  const elapsedMs = Date.now() - startedAt;
  return { requestId, ok: true, tool, elapsedMs, result: payload };
}

export function wrapError({ requestId, tool, startedAt, code, message, details }) {
  const elapsedMs = Date.now() - startedAt;
  return { requestId, ok: false, tool, elapsedMs, error: { code, message, details } };
}
