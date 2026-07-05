Vercel + Supabase deployment notes

1) Setup environment variables on Vercel

- Project settings -> Environment Variables
- Add `SUPABASE_URL` = your Supabase project URL (e.g. https://nlmhellbkwswweutmeda.supabase.co)
- Add `SUPABASE_ANON_KEY` = your Supabase anon/public key
- Add these to both "Production" and "Preview" as needed.

2) Build command for Vercel

- Set the Build Command to:

  node scripts/generate-supabase-config.js

This will create `supabase-config.js` from the environment variables so the browser can read them at runtime.

3) Files added

- `scripts/generate-supabase-config.js` — writes `supabase-config.js` at build time
- `supabase-config.js` — generated during build (do NOT commit keys)
- `package.json` — provides `vercel-build` and `generate-config` scripts (optional)

4) Local testing

- Locally, create a file named `supabase-config.js` in the project root with the contents:

  window.SUPABASE_URL = 'https://<your-project>.supabase.co';
  window.SUPABASE_ANON_KEY = '<your-anon-key>';

5) Security

- Never commit `supabase-config.js` with keys to source control. Use Vercel env variables to inject keys at build time.

6) Database schema (example)

- Create a table `rooms` with columns:
  - `code` TEXT PRIMARY KEY
  - `data` JSONB

- Optionally create other tables for chat messages or use `data.chatMessages` inside `rooms.data`.

Example SQL (Supabase SQL editor):

CREATE TABLE public.rooms (
  code text PRIMARY KEY,
  data jsonb
);

-- KV table for arbitrary localStorage keys
CREATE TABLE public.kv (
  key text PRIMARY KEY,
  value jsonb
);

-- Example: run the migration locally

1) Export localStorage from your browser console to `localstorage-export.json`:

```js
const dump = {};
for (let i = 0; i < localStorage.length; i++) {
  const k = localStorage.key(i);
  try {
    dump[k] = JSON.parse(localStorage.getItem(k));
  } catch (e) {
    dump[k] = localStorage.getItem(k);
  }
}
console.log(JSON.stringify(dump));
```

Copy the output JSON into a file named `localstorage-export.json` in the project root.

2) Run the migration (requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars):

```bash
npm run migrate-localstorage
```

This will upsert each key into `kv` and populate `rooms` into the `rooms` table.

7) Deploy to Vercel (recommended)

Option A — Deploy via Vercel Dashboard (no CLI):

- Create a new Vercel Project, link to your Git repository or import manually.
- In Project Settings -> Environment Variables, add the following (Production & Preview):
  - `SUPABASE_URL` = https://nlmhellbkwswweutmeda.supabase.co
  - `SUPABASE_ANON_KEY` = (your anon/public key)
  - `SUPABASE_SERVICE_ROLE_KEY` = (only if you plan to run migration via CI)
- Set the Build Command to: `npm run vercel-build`
- Deploy the project.

GitHub Actions automated deploy (recommended)

You can automate everything with CI by adding the following GitHub Secrets in your repository settings:

- `SUPABASE_URL` — your Supabase URL (e.g. https://nlmhellbkwswweutmeda.supabase.co)
- `SUPABASE_ANON_KEY` — your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (for migrations)
- `VERCEL_TOKEN` — a Vercel token with deploy privileges
- `LOCALSTORAGE_JSON` (optional) — the exported localStorage JSON string to import during CI

I included a GitHub Actions workflow at `.github/workflows/deploy.yml` that runs on push to `main`. It will:

- Run `npm run generate-config` to create `supabase-config.js` from secrets
- If `LOCALSTORAGE_JSON` is provided, write it to `localstorage-export.json` and run the migration
- Deploy to Vercel using the `VERCEL_TOKEN`

To enable this:

1. Create the GitHub repository and push your project.
2. Add the secrets listed above in the repository's Settings → Secrets → Actions.
3. Push to `main` — the workflow will execute automatically.

Option B — Deploy via Vercel CLI (recommended for one-off deploys):

1) Install Vercel CLI:

```bash
npm i -g vercel
```

2) Log in and link to project (use your account):

```bash
vercel login
vercel link --project prj_ubUXIwA9xk9uUVDXTT1dXq6IEDbh
```

3) Add env vars to the project (you can also set them in the dashboard):

```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
# (optional for migration) set service role key as a secret in your CI or locally
```

4) Deploy (production):

```bash
vercel --prod
```

If you want to script deploys from CI, set `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as protected environment variables in Vercel and run `vercel --prod --token $VERCEL_TOKEN` in CI.

Important: Do NOT commit `supabase-config.js` or any secrets. The `generate-supabase-config.js` script runs at build time and emits `supabase-config.js` using env vars.

