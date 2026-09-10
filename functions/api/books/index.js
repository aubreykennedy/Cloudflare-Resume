import { json, error, requireDB, str } from '../../_lib.js';

const STATUSES = new Set(['finished', 'reading', 'queued']);

// GET /api/books  — public, newest first
export async function onRequestGet({ env }) {
  const db = requireDB(env);
  const { results } = await db.prepare(
    'SELECT id, title, subtitle, author, genre, status, notes, sort_order, created_at, updated_at FROM books ORDER BY sort_order DESC, id DESC'
  ).all();
  return json({ ok: true, books: results }, 200, { 'cache-control': 'public, max-age=60' });
}

// POST /api/books  — admin
export async function onRequestPost({ request, env }) {
  const db = requireDB(env);
  const body = await request.json().catch(() => ({}));
  const title = str(body.title, 300), author = str(body.author, 300);
  if (!title || !author) return error('Title and author are required.');
  const status = STATUSES.has(body.status) ? body.status : 'finished';
  const top = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM books').first();
  const res = await db.prepare(
    'INSERT INTO books (title, subtitle, author, genre, status, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(title, str(body.subtitle, 500), author, str(body.genre, 120), status, str(body.notes, 2000), (top?.m || 0) + 1).run();
  const book = await db.prepare('SELECT * FROM books WHERE id = ?').bind(res.meta.last_row_id).first();
  return json({ ok: true, book }, 201);
}
