import { error, isAuthorized, HttpError } from '../_lib.js';

// Every write to /api/* needs the admin password as a bearer token.
// Reads (GET) are public: the site itself uses them.
export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();
  const writing = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

  if (writing) {
    if (!env.ADMIN_PASSWORD) {
      return error('ADMIN_PASSWORD is not configured for this deployment (see README.md).', 503);
    }
    if (!(await isAuthorized(request, env))) {
      return error('Not authorized.', 401);
    }
  }

  try {
    return await context.next();
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status);
    console.error(e);
    return error('Server error: ' + (e && e.message ? e.message : String(e)), 500);
  }
}
