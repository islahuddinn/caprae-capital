# Demo Guide

## The 90-second story

1. Open the Action Queue and explain that the tool reduces the delay between sourcing and the next useful action.
2. Point to the visible fit-score rubric. Explain that prioritization is deterministic and auditable.
3. Import `data/sample-targets.csv`. Show the server-normalization path in production and the local fallback during Vite development.
4. Open the highest-ranked target and show evidence plus watch-outs.
5. Click **Draft outreach**. Explain that AI generates language only; it does not decide priority.
6. Show the provider label. With no API key locally, it should say `local fallback`; in Vercel it reports the model or deterministic server fallback.
7. Mark the target contacted and reload the page to demonstrate persisted local workflow state.
8. Export the queue as CSV.

## Talking points

- SaaSQuatch already solves discovery and enrichment; DealFlow focuses on execution after discovery.
- Missing data is shown before outreach, which protects trust.
- Neon/Postgres is the production persistence layer; the local browser store keeps the public assessment demo credential-free.
- The score stays explainable while the language task is delegated to AI.

## Reviewer questions

**Why not use AI for scoring?** Ranking affects allocation of attention, so it should be inspectable and stable. AI can help draft language without becoming an un-auditable decision maker.

**What happens if the LLM is unavailable?** The server returns a deterministic fallback, so the workflow remains usable.

**What is production next?** Authenticated workspace claims, Neon-backed target loading/saving from the UI, background enrichment jobs, rate limits, observability, and retention controls.
