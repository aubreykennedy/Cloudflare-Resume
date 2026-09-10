// GET /art/<key>  — serves an uploaded painting straight from R2.
export async function onRequestGet({ env, params }) {
  if (!env.ART) return new Response('Image storage is not connected.', { status: 503 });
  const key = 'art/' + (Array.isArray(params.key) ? params.key.join('/') : params.key || '');
  if (key.includes('..')) return new Response('Bad key', { status: 400 });
  const obj = await env.ART.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
}
