Deploying Photocom (Vercel)

1. Setup environment variables
   - In the project root copy `.env.example` to `.env` for local testing (do NOT commit `.env`).
   - On Vercel dashboard, open your project > Settings > Environment Variables and add:
     - `SUPABASE_URL` = your Supabase URL (e.g. https://xyz.supabase.co)
     - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase Service Role Key (secret - do NOT expose)

2. Deploy options
   - Option A (recommended): Connect your Git repo to Vercel and push `main`/`master`. Vercel will build and deploy automatically.
   - Option B: Use Vercel CLI locally:

```powershell
# Install Vercel CLI if needed
npm i -g vercel
# From Photocom folder
vercel login
vercel --prod
```

3. Verify serverless API
   - After deployment, test the server endpoint `/api/save-room` via a POST request (use Postman or curl) with a minimal payload, e.g.:

```bash
curl -X POST https://<your-vercel-app>.vercel.app/api/save-room \
  -H 'Content-Type: application/json' \
  -d '{"room_code":"ABC123","teacher_id":"<teacher-uuid>","active":true}'
```

   - Successful response: JSON with `{ ok: true, ... }` and the persisted record.
   - If you get an RLS/42501 error from the client, ensure the request was made to the server endpoint (not directly to Supabase from the browser). The server must have `SUPABASE_SERVICE_ROLE_KEY` set.

4. Local development
   - For local testing of `/api/save-room`, set `.env` with the two vars and run a local server (Vercel dev or a static server that supports serverless functions):

```powershell
# If you use Vercel dev
vercel dev
```

5. Security notes
   - `SUPABASE_SERVICE_ROLE_KEY` grants full access; never expose it in client-side code or commit it.
   - Use RLS policies in Supabase to limit access; the service role key is only for server-side trusted operations.
