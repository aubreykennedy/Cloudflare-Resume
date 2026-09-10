# aubreykennedy.com

A Cloudflare Worker. `public/` is served as static assets; `worker.js` routes the
API to the handlers in `functions/`, backed by D1 (books, paintings, projects)
and R2 (uploaded images).

```
worker.js            entry point: routes /api/* and /art/*, serves public/ for everything else
wrangler.jsonc       Worker config (name, assets, bindings)
public/              the site itself
  index.html           bubble chamber home page
  professional.html    work history, education, projects
  personal.html        books, art, travel, recipes
  physics.html         notes: QFT, QED, QCD, quantum hydrodynamics
  contact.html         contact form (posts to the existing Worker)
  admin.html           password-gated panel: books, paintings, projects
  assets/              site.css, chamber.js (simulation), site.js, fallback-data.js
  images/              original paintings and makeup photos
functions/           request handlers, in the Pages style (onRequestGet, onRequestPost, …)
schema.sql           D1 tables + seed data
```

The site works before the database is connected. The API answers 503 and the
pages fall back to the lists in `public/assets/fallback-data.js`, so nothing
looks broken.

## Turning on the admin panel

All commands run from the repo root. `npx wrangler login` opens a browser the
first time.

1. **Create the database and bucket**

   ```bash
   npx wrangler d1 create aubreykennedy-site
   ```

   ```bash
   npx wrangler r2 bucket create aubreykennedy-art
   ```

2. **Add the bindings.** In `wrangler.jsonc`, uncomment the `d1_databases` and
   `r2_buckets` lines and paste the `database_id` that the first command printed.

3. **Create the tables and load the seed data** (27 books, 9 paintings, 7 projects)

   ```bash
   npm run db:remote
   ```

4. **Set the admin password.** This is a secret, so it is never committed:

   ```bash
   npx wrangler secret put ADMIN_PASSWORD
   ```

5. **Deploy** by pushing to `main`. Cloudflare Workers Builds picks it up, or you
   can deploy by hand with `npm run deploy`.

Then open `/admin.html`, sign in, and add books or upload paintings. Uploads are
shrunk in the browser to 1800px before they are sent.

## Local development

```bash
cp .dev.vars.example .dev.vars
```

Set `ADMIN_PASSWORD` in that file, then:

```bash
npm run db:local
```

```bash
npm run dev
```

The site runs at http://localhost:8788 with local D1 and R2 storage, so nothing
touches production. Local development needs the bindings from step 2
uncommented; the ids are only used against the real account when you deploy.

## Adding content without the admin panel

- **Books** live only in the database. Use the admin panel, or
  `npx wrangler d1 execute aubreykennedy-site --remote --command "INSERT INTO books (title, author, genre) VALUES ('…','…','…')"`.
- **Paintings** can also be plain files: drop the image into `public/images/` and
  insert a row with `image_key = 'images/<file>'`.
- The fallback lists in `public/assets/fallback-data.js` only matter when the API
  is unreachable.

## Hardening the admin (optional)

The admin API accepts a single shared password sent as a bearer token over
HTTPS. For another layer, put Cloudflare Access in front of `/admin.html` and
non-GET requests to `/api/*`; it adds email-based login with no code changes.
