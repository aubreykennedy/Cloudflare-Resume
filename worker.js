/**
 * worker.js — the Cloudflare Worker entry point.
 *
 * Workers does not use the Pages `functions/` directory convention, so this
 * file routes requests to those same handler modules and serves everything
 * else from the static assets binding.
 *
 * The handlers in functions/ are untouched and still use the Pages signature
 * (onRequestGet, onRequestPost, …), so the code stays portable if this ever
 * moves back to Pages.
 */

import * as apiMiddleware from './functions/api/_middleware.js';
import * as auth from './functions/api/auth.js';
import * as books from './functions/api/books/index.js';
import * as bookById from './functions/api/books/[id].js';
import * as art from './functions/api/art/index.js';
import * as artById from './functions/api/art/[id].js';
import * as projects from './functions/api/projects/index.js';
import * as projectById from './functions/api/projects/[id].js';
import * as artAsset from './functions/art/[[key]].js';

const ROUTES = [
  { pattern: /^\/api\/auth$/, mod: auth },
  { pattern: /^\/api\/books$/, mod: books },
  { pattern: /^\/api\/books\/([^/]+)$/, mod: bookById, keys: ['id'] },
  { pattern: /^\/api\/art$/, mod: art },
  { pattern: /^\/api\/art\/([^/]+)$/, mod: artById, keys: ['id'] },
  { pattern: /^\/api\/projects$/, mod: projects },
  { pattern: /^\/api\/projects\/([^/]+)$/, mod: projectById, keys: ['id'] },
  { pattern: /^\/art\/(.+)$/, mod: artAsset, keys: ['key'] },
];

const METHOD_HANDLERS = {
  GET: 'onRequestGet',
  HEAD: 'onRequestGet',
  POST: 'onRequestPost',
  PUT: 'onRequestPut',
  PATCH: 'onRequestPatch',
  DELETE: 'onRequestDelete',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // normalise a trailing slash so /api/books/ matches /api/books
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

    for (const route of ROUTES) {
      const match = route.pattern.exec(path);
      if (!match) continue;

      const params = {};
      (route.keys || []).forEach((key, i) => {
        params[key] = decodeURIComponent(match[i + 1]);
      });

      const handler = route.mod[METHOD_HANDLERS[request.method]] || route.mod.onRequest;
      if (!handler) {
        return new Response('Method not allowed', { status: 405 });
      }

      const context = {
        request,
        env,
        params,
        data: {},
        waitUntil: ctx.waitUntil.bind(ctx),
        passThroughOnException: () => {},
        next: () => handler(context),
      };

      try {
        // everything under /api runs through the auth middleware first
        return path.startsWith('/api/')
          ? await apiMiddleware.onRequest(context)
          : await handler(context);
      } catch (err) {
        console.error(err);
        return new Response('Server error', { status: 500 });
      }
    }

    // Not an API route: serve a static file from public/.
    // html_handling is "none" so that /personal.html is served directly rather
    // than redirected, which means the two friendly cases are handled here.
    const assetUrl = new URL(url);
    if (assetUrl.pathname.endsWith('/')) {
      assetUrl.pathname += 'index.html';
    }
    const response = await env.ASSETS.fetch(new Request(assetUrl, request));
    if (response.status === 404 && !/\.[a-z0-9]+$/i.test(assetUrl.pathname)) {
      // an extensionless path such as /personal: try /personal.html
      const withHtml = new URL(assetUrl);
      withHtml.pathname += '.html';
      const alt = await env.ASSETS.fetch(new Request(withHtml, request));
      if (alt.status !== 404) return alt;
    }
    return response;
  },
};
