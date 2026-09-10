# aubreykennedy.com

Static site on Cloudflare Pages, with a small admin panel backed by Cloudflare D1 (books, paintings, projects) and R2 (uploaded images).

```
index.html          the bubble chamber home page
professional.html   timeline, education, builds
personal.html       reading archive + gallery (loaded from /api), travel, recipes
physics.html        field notes: QED, QCD, quantum hydrodynamics
contact.html        contact form (posts to the existing Worker)
admin.html          password-gated panel: books, paintings, projects (with photos)
assets/             site.css (design system), chamber.js (simulation), site.js, fallback-data.js
functions/          Pages Functions: /api/books, /api/art, /api/projects, /api/auth, /art/<key>
schema.sql          D1 tables + seed data
wrangler.example.toml  local-dev bindings template (copy to wrangler.toml, which is git-ignored)
```

If the database is not connected yet, the site still works: `personal.html` and `professional.html` fall back to the lists in `assets/fallback-data.js`.

## One-time setup (about 10 minutes)

All commands run from the repo root. `npx wrangler login` opens a browser the first time.

1. **Create the database and bucket**

   ```bash
   npx wrangler d1 create aubreykennedy-site
   npx wrangler r2 bucket create aubreykennedy-art
   ```

   Paste the `database_id` that the first command prints into your local `wrangler.toml` (used for local development only).

2. **Create the tables and load the seed data** (your existing 22 books, 9 paintings and 7 projects)

   ```bash
   npm run db:remote
   ```

3. **Set the admin password** as a secret on the Pages project (Dashboard → Workers & Pages → your project → Settings → Variables and Secrets → Add → type *Secret*, name `ADMIN_PASSWORD`). Or from the CLI:

   ```bash
   npx wrangler pages secret put ADMIN_PASSWORD --project-name <your-pages-project-name>
   ```

4. **Bind D1 and R2 to the Pages project** in the dashboard: Settings → Bindings → add a *D1 database* with variable name `DB` (choose `aubreykennedy-site`) and an *R2 bucket* with variable name `ART` (choose `aubreykennedy-art`). Save, then redeploy (Deployments → Retry, or push any commit).

5. **Deploy** by pushing to `main` as usual. Then open `/admin.html`, sign in, and add books or upload paintings. Uploads are shrunk in the browser to 1800 px before they are sent.

## Local development

```bash
cp wrangler.example.toml wrangler.toml   # local bindings (git-ignored)
cp .dev.vars.example .dev.vars           # set ADMIN_PASSWORD for local use
npm run db:local                    # creates a local D1 with the seed data
npm run dev                         # http://localhost:8788
```

Locally, D1 and R2 are simulated by Wrangler; nothing touches production.

## Adding content without the admin panel

- **Books** are only in the database. Use the admin panel, or `npx wrangler d1 execute aubreykennedy-site --remote --command "INSERT INTO books (title, author, genre) VALUES ('…','…','…')"`.
- **Paintings** can also be plain files: drop the image into `images/` and insert a row with `image_key = 'images/<file>'`.
- The fallback lists in `assets/fallback-data.js` only matter when the API is unreachable.

## Hardening the admin (optional)

The admin API accepts a single shared password sent as a bearer token over HTTPS. For an extra layer, put Cloudflare Access (Zero Trust) in front of `/admin.html` and `/api/*` for non-GET requests; it adds email-based login without any code changes.
