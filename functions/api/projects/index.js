import { json, error, requireDB, str, storeImage } from '../../_lib.js';

const STATUSES = new Set(['done', 'next']);

// GET /api/projects  — public, in display order
export async function onRequestGet({ env }) {
  const db = requireDB(env);
  const { results } = await db.prepare(
    'SELECT id, name, principle, description, status, image_key, sort_order, created_at FROM projects ORDER BY sort_order ASC, id ASC'
  ).all();
  return json({ ok: true, projects: results }, 200, { 'cache-control': 'public, max-age=60' });
}

// POST /api/projects  — admin, multipart form (image optional)
export async function onRequestPost({ request, env }) {
  const db = requireDB(env);
  const form = await request.formData().catch(() => null);
  if (!form) return error('Expected a multipart form.');
  const name = str(form.get('name'), 200);
  if (!name) return error('Name is required.');
  const status = STATUSES.has(form.get('status')) ? form.get('status') : 'done';
  const file = form.get('image');
  const key = file && typeof file !== 'string' && file.size ? await storeImage(env, file, 'projects', name) : null;
  const top = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM projects').first();
  const res = await db.prepare(
    'INSERT INTO projects (name, principle, description, status, image_key, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(name, str(form.get('principle'), 200), str(form.get('description'), 1000), status, key, (top?.m || 0) + 1).run();
  const project = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(res.meta.last_row_id).first();
  return json({ ok: true, project }, 201);
}
