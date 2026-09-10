import { json, error, requireDB, str } from '../../_lib.js';

const STATUSES = new Set(['finished', 'reading', 'queued']);

function idOf(params) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PUT /api/books/:id  — admin
export async function onRequestPut({ request, env, params }) {
  const db = requireDB(env);
  const id = idOf(params);
  if (!id) return error('Bad id.');
  const body = await request.json().catch(() => ({}));
  const title = str(body.title, 300), author = str(body.author, 300);
  if (!title || !author) return error('Title and author are required.');
  const status = STATUSES.has(body.status) ? body.status : 'finished';
  const res = await db.prepare(
    "UPDATE books SET title=?, subtitle=?, author=?, genre=?, status=?, notes=?, updated_at=datetime('now') WHERE id=?"
  ).bind(title, str(body.subtitle, 500), author, str(body.genre, 120), status, str(body.notes, 2000), id).run();
  if (!res.meta.changes) return error('Not found.', 404);
  const book = await db.prepare('SELECT * FROM books WHERE id = ?').bind(id).first();
  return json({ ok: true, book });
}

// DELETE /api/books/:id  — admin
export async function onRequestDelete({ env, params }) {
  const db = requireDB(env);
  const id = idOf(params);
  if (!id) return error('Bad id.');
  const res = await db.prepare('DELETE FROM books WHERE id = ?').bind(id).run();
  if (!res.meta.changes) return error('Not found.', 404);
  return json({ ok: true });
}
