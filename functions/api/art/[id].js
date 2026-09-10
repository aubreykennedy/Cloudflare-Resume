import { json, error, requireDB, str } from '../../_lib.js';

const MEDIA = new Set(['acrylic', 'makeup', 'watercolor', 'digital', 'other']);

function idOf(params) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PUT /api/art/:id  — admin, metadata only
export async function onRequestPut({ request, env, params }) {
  const db = requireDB(env);
  const id = idOf(params);
  if (!id) return error('Bad id.');
  const body = await request.json().catch(() => ({}));
  const title = str(body.title, 200) || 'Untitled';
  const medium = MEDIA.has(body.medium) ? body.medium : 'acrylic';
  const res = await db.prepare(
    'UPDATE artworks SET title=?, medium=?, year=?, caption=? WHERE id=?'
  ).bind(title, medium, str(body.year, 20), str(body.caption, 1000), id).run();
  if (!res.meta.changes) return error('Not found.', 404);
  const art = await db.prepare('SELECT * FROM artworks WHERE id = ?').bind(id).first();
  return json({ ok: true, art });
}

// DELETE /api/art/:id  — admin; also removes the uploaded file from R2
export async function onRequestDelete({ env, params }) {
  const db = requireDB(env);
  const id = idOf(params);
  if (!id) return error('Bad id.');
  const row = await db.prepare('SELECT image_key FROM artworks WHERE id = ?').bind(id).first();
  if (!row) return error('Not found.', 404);
  await db.prepare('DELETE FROM artworks WHERE id = ?').bind(id).run();
  if (env.ART && row.image_key && row.image_key.startsWith('art/')) {
    await env.ART.delete(row.image_key).catch(() => {});
  }
  return json({ ok: true });
}
