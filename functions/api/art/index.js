import { json, error, requireDB, requireBucket, str, slug } from '../../_lib.js';

const MEDIA = new Set(['acrylic', 'makeup', 'watercolor', 'digital', 'other']);
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 8 * 1024 * 1024;

// GET /api/art  — public, newest first
export async function onRequestGet({ env }) {
  const db = requireDB(env);
  const { results } = await db.prepare(
    'SELECT id, title, medium, year, caption, image_key, width, height, sort_order, created_at FROM artworks ORDER BY sort_order DESC, id DESC'
  ).all();
  return json({ ok: true, art: results }, 200, { 'cache-control': 'public, max-age=60' });
}

// POST /api/art  — admin, multipart/form-data with an `image` file
export async function onRequestPost({ request, env }) {
  const db = requireDB(env);
  const bucket = requireBucket(env);
  const form = await request.formData().catch(() => null);
  if (!form) return error('Expected a multipart form.');
  const file = form.get('image');
  if (!file || typeof file === 'string') return error('Choose an image to upload.');
  const ext = TYPES[file.type];
  if (!ext) return error('Images must be JPEG, PNG or WebP.');
  if (file.size > MAX_BYTES) return error('Image is too large (max 8 MB). The admin page normally shrinks images before upload.');

  const title = str(form.get('title'), 200) || 'Untitled';
  const medium = MEDIA.has(form.get('medium')) ? form.get('medium') : 'acrylic';
  const year = str(form.get('year'), 20);
  const caption = str(form.get('caption'), 1000);
  const width = Number(form.get('width')) || null;
  const height = Number(form.get('height')) || null;

  const key = `art/${Date.now().toString(36)}-${slug(title)}.${ext}`;
  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { title },
  });

  const top = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM artworks').first();
  const res = await db.prepare(
    'INSERT INTO artworks (title, medium, year, caption, image_key, width, height, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(title, medium, year, caption, key, width, height, (top?.m || 0) + 1).run();
  const art = await db.prepare('SELECT * FROM artworks WHERE id = ?').bind(res.meta.last_row_id).first();
  return json({ ok: true, art }, 201);
}
