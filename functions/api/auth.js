import { json } from '../_lib.js';

// POST /api/auth  — the middleware already checked the bearer token,
// so reaching here means the password is right.
export async function onRequestPost() {
  return json({ ok: true });
}
