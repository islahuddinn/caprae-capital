# Vercel + Neon Deployment

## 1. Create the Vercel project

1. Import the GitHub repository into Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Install command: `npm install`.

The `api/` directory is deployed as Vercel Node.js serverless functions. Do not add a custom `api` build step.

## 2. Add environment variables

In Vercel Project Settings -> Environment Variables, add:

- `DATABASE_URL`: the Neon pooled connection string.
- `OPENAI_API_KEY`: optional server-side key for AI outreach.
- `OPENAI_MODEL`: optional model name, default `gpt-4o-mini`.

Use the same values for Preview and Production only when appropriate. Never prefix secrets with `VITE_`; Vite variables are exposed to the browser.

## 3. Run the database migration

From a trusted local shell, set `DATABASE_URL` and run:

```bash
npm run db:migrate
```

The migration is idempotent and creates `targets`, `target_events`, constraints, and indexes. Do not paste the connection string into source files, commits, screenshots, or issue comments.

## 4. Deploy

```bash
vercel --prod
```

Or push to `main` and allow the connected Vercel project to deploy automatically.

## 5. Smoke test

After deployment:

```bash
curl -i -X POST "$VERCEL_URL/api/normalize" \
  -H 'Content-Type: text/csv' \
  --data-binary @data/sample-targets.csv

curl -i "$VERCEL_URL/api/targets" \
  -H 'x-workspace-id: demo'
```

The app must still work when `OPENAI_API_KEY` is absent: the outreach endpoint returns a deterministic, clearly labeled fallback.

## Production notes

- Replace the demo workspace header with authenticated workspace claims before handling real customer data.
- Restrict CORS if the API is separated from the frontend.
- Add Vercel project protection and Neon branch protection.
- Monitor function errors and latency with Vercel logs and an error tracker.
- Rotate the Neon and OpenAI credentials immediately if either is ever exposed.
