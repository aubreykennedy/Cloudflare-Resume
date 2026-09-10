// Shared helpers for the Pages Functions API.

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

export function error(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

export function requireDB(env) {
  if (!env.DB) {
    throw new HttpError(
      'Database is not connected yet. Create the D1 database and bind it as "DB" (see README.md).', 503);
  }
  return env.DB;
}

export function requireBucket(env) {
  if (!env.ART) {
    throw new HttpError('Image storage is not connected yet. Create the R2 bucket and bind it as "ART" (see README.md).', 503);
  }
  return env.ART;
}

export class HttpError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// Constant-time comparison of two strings via SHA-256 digests.
export async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(String(a))),
    crypto.subtle.digest('SHA-256', enc.encode(String(b))),
  ]);
  const va = new Uint8Array(ha), vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

export async function isAuthorized(request, env) {
  const expected = env.ADMIN_PASSWORD;
  if (!expected) return false;
  const header = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return false;
  return safeEqual(m[1].trim(), expected);
}

export function str(v, max = 500) {
  if (v == null) return '';
  return String(v).trim().slice(0, max);
}

export function slug(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 60) || 'untitled';
}

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Store an uploaded image in R2 under art/<prefix>-<time>-<slug>.<ext> and return the key.
export async function storeImage(env, file, prefix, title) {
  const bucket = requireBucket(env);
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new HttpError('Images must be JPEG, PNG or WebP.', 400);
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError('Image is too large (max 8 MB).', 400);
  const key = `art/${prefix}-${Date.now().toString(36)}-${slug(title)}.${ext}`;
  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { title: String(title || '') },
  });
  return key;
}
