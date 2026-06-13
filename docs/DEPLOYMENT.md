# Deployment & CI/CD

L Health ships to **Cloudflare Workers** via OpenNext. Source of truth for data is
**Cloudflare D1**. CI/CD runs on **GitHub Actions**.

## Pipelines

| Workflow | File | Trigger | Does |
|---|---|---|---|
| **CI** | `.github/workflows/ci.yml` | PRs into `main`, pushes to any non-`main` branch | `npm ci` → `cf-typegen` → typecheck → tests → OpenNext build. No credentials, no deploy. |
| **Deploy (production)** | `.github/workflows/deploy.yml` | push/merge to `main`, or manual `workflow_dispatch` | Re-validates (typecheck + tests + build) → applies remote D1 migrations → deploys to Cloudflare. |

- `main` is the **production** branch. Merging to it auto-deploys.
- Node version is pinned in `.nvmrc` (`22`).
- Concurrency: only one production deploy runs at a time and in-flight deploys are never cancelled.

## One-time setup — required GitHub secret

The deploy workflow needs a single secret: **`CLOUDFLARE_API_TOKEN`**.
(The Cloudflare **account ID** is already in `wrangler.jsonc`, so it is not a secret.)

1. Cloudflare dashboard → **My Profile → API Tokens → Create Token**.
2. Use the **“Edit Cloudflare Workers”** template, or a custom token with at least:
   - Account · **Workers Scripts** · Edit
   - Account · **D1** · Edit
   - Account · **Workers KV Storage** · Edit *(OpenNext incremental cache)*
   - Account · **Account Settings** · Read
   - User · **User Details** · Read
   - (Workers.dev only — no Zone scopes needed.)
   - Scope it to the account that owns the `l-health` Worker.
3. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: the token from step 2.

Until this secret exists, the deploy job fails fast with a clear message (the build/test
steps still pass).

## Application secrets (Worker, not CI)

These live as **Worker secrets** (set once with `wrangler secret put <NAME>`), not in GitHub
Actions. They persist across deploys, so the pipeline does not manage them:

- `BETTER_AUTH_SECRET` — session/cookie signing secret.
- `BETTER_AUTH_URL` — public origin (production Worker URL).
- `INVITE_CODE` — invite-only sign-up gate.

Local dev reads the same names from `.dev.vars` (gitignored). See `.env.example`.

## Manual deploy (fallback)

From a clean checkout with the Cloudflare token in your environment:

```bash
npm ci
npm run db:migrate:remote   # apply pending D1 migrations
npm run deploy              # opennextjs-cloudflare build && deploy
```

## Rollback

- **Code:** revert the offending commit on `main` and push — the pipeline redeploys the
  previous good state. (`git revert <sha> && git push`.)
- **Immediate:** `npx wrangler rollback` (reverts the Worker to the previous version) or
  re-deploy a known-good commit via the `workflow_dispatch` button.
- D1 migrations are forward-only; write a new migration to undo schema changes rather than
  rolling a migration back.
