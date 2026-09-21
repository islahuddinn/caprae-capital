# DealFlow Action Queue

DealFlow is a focused workflow layer for a SaaSQuatch-style company and contact search product. It turns researched targets into a ranked queue with evidence, data-quality warnings, ownership, follow-up, and founder outreach.

## Why this feature

The public SaaSQuatch product already exposes search, enrichment, revenue estimates, validators, exports, research, and outreach-oriented tools. This prototype deliberately does not rebuild those capabilities. It reduces the operational delay between finding a company and taking the next useful action.

The key user question is: **Which target should I work on next, why, and what should happen now?**

## Features

- Import SaaSQuatch-style CSV exports.
- Validate required identity fields and normalize domains.
- Deduplicate by company domain before adding records.
- Calculate a deterministic, explainable acquisition-fit score.
- Show positive signals and data-quality risks.
- Filter by search, priority, and workflow status.
- Assign an owner and follow-up date.
- Draft founder outreach from structured target evidence.
- Generate outreach through a server-side OpenAI-compatible endpoint, with a deterministic fallback when no key is configured.
- Export the current queue as CSV.
- Persist workflow changes locally in the browser.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Validate

```bash
npm run lint
npm run build
```

## Production deployment

This project uses Vercel serverless functions and Neon Postgres. Copy `.env.example` to `.env.local`, set `DATABASE_URL`, and run the idempotent migration:

```bash
npm run db:migrate
```

Set `DATABASE_URL`, `OPENAI_API_KEY` (optional), and `OPENAI_MODEL` in Vercel Project Settings. Never expose these as `VITE_*` variables. Full instructions are in [docs/vercel-deployment.md](docs/vercel-deployment.md), and the recording script is in [docs/demo-guide.md](docs/demo-guide.md).

The Neon URL is intentionally not stored in this repository. The connection string supplied during setup must be rotated if it has been shared outside a private environment.

## CSV format

The importer requires `company_name` and `website`. It accepts these optional fields:

```text
industry, location, revenue_estimate, employee_count, founded_year,
owner_name, contact_email, linkedin_url, confidence, description
```

A safe demonstration file is available at [data/sample-targets.csv](data/sample-targets.csv). The records use reserved `.example` domains and contain no real personal data.

## Scoring

The first prototype uses an explainable heuristic rather than an opaque AI ranking:

- Industry captured: 25-point base signal.
- Revenue in the $2M-$20M thesis range: 20 points.
- Known location: 10 points.
- 10-100 employees: 10 points.
- Owner identified: 15 points.
- Established business: 10 points.
- High data confidence: 5 points.
- Contact email available: 5 points.

The UI shows the resulting evidence and risks. A production version should make thesis weights configurable and version each scoring policy for auditability.

## Architecture

```text
CSV upload
  -> Papa Parse header parsing
  -> required-field validation
  -> domain normalization and deduplication
  -> deterministic scoring and risk detection
  -> React action queue
  -> target brief / outreach / CSV export
```

### Backend and storage

The repository includes two Vercel serverless routes: `/api/normalize` parses and validates CSV input on the server, and `/api/draft-outreach` calls an OpenAI-compatible model without exposing the API key to the browser. The local Vite demo falls back to the same parser and a deterministic template when serverless routes or credentials are unavailable.

The production database schema is in [supabase/schema.sql](supabase/schema.sql). It stores targets and target events in Supabase Postgres, enforces workspace-scoped row-level security, and indexes score/status views. The current assessment demo keeps workflow state in browser `localStorage` so no prospect data is sent to an unconfigured database; this boundary is explicit rather than pretending local state is production persistence.

### Production evolution

For a deployed multi-user version, the recommended stack is:

- React/Next.js frontend with server-rendered workspace shell.
- FastAPI or Next.js route handlers for import jobs and scoring policies.
- Supabase Postgres with row-level security for workspaces, targets, activities, and assignments.
- Object storage for raw imports with a retention policy and signed URLs.
- Background jobs for enrichment and retryable source adapters.
- Redis or provider edge caching for repeated enrichment lookups.
- Vercel for the frontend and serverless routes, with a managed worker for long-running imports.
- Sentry and structured audit logs for operational visibility.

The client-first implementation is intentional for a five-hour challenge. It demonstrates the business workflow without pretending to have access to SaaSQuatch's private APIs.

## Privacy and reliability decisions

- No scraping, CAPTCHA bypassing, or IP-rotation logic is included.
- The demo dataset uses reserved domains and synthetic contacts.
- The AI route uses only structured target evidence and has a deterministic fallback.
- Missing or low-confidence fields are visible before outreach.
- Duplicate domains are skipped with an import summary.
- Scores are deterministic and inspectable.
- Production persistence should enforce workspace-level authorization and deletion/retention controls.

## Challenge fit

The handbook asks for one or two high-impact improvements within five hours, plus a repository, README, dataset where permissible, and a 1-2 minute walkthrough. DealFlow targets the business-use-case, UX, technicality, design, and creativity criteria without claiming that the authenticated SaaSQuatch dashboard lacks similar functionality.
