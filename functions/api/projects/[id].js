import { json, error, requireDB, str, storeImage } from '../../_lib.js';

const STATUSES = new Set(['done', 'next']);

function idOf(params) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PUT /api/projects/:id  — admin, multipart form; a new image replaces the old one
export async function onRequestPut({ request, env, params }) {
  const db = requireDB(env);
  const id = idOf(params);
  if (!id) return error('Bad id.');
  const row = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  if (!row) return error('Not found.', 404);
  const form = await request.formData().catch(() => null);
  if (!form) return error('Expected a multipart form.');
  const name = str(form.get('name'), 200);
  if (!name) return error('Name is required.');
  const status = STATUSES.has(form.get('status')) ? form.get('status') : 'done';
  let key = row.image_key;
  const file = form.get('image');
  if (file && typeof file !== 'string' && file.size) {
    key = await storeImage(env, file, 'projects', name);
    if (row.image_key && env.ART) await env.ART.delete(row.image_key).catch(() => {});
  } else if (form.get('remove_image') === '1') {
    if (row.image_key && env.ART) await env.ART.delete(row.image_key).catch(() => {});
    key = null;
  }
  const order = Number(form.get('sort_order'));
  await db.prepare('UPDATE projects SET name=?, principle=?, description=?, status=?, image_key=?, sort_order=? WHERE id=?')
    .bind(name, str(form.get('principle'), 200), str(form.get('description'), 1000), status, key, Number.isFinite(order) && order > 0 ? order : row.sort_order, id).run();
  const project = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  return json({ ok: true, project });
}

// DELETE /api/projects/:id  — admin
export async function onRequestDelete({ env, params }) {
  const db = requireDB(env);
  const id = idOf(params);
  if (!id) return error('Bad id.');
  const row = await db.prepare('SELECT image_key FROM projects WHERE id = ?').bind(id).first();
  if (!row) return error('Not found.', 404);
  await db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  if (env.ART && row.image_key) await env.ART.delete(row.image_key).catch(() => {});
  return json({ ok: true });
}
