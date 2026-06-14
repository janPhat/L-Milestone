# Deployment & CI/CD

L Health ships to **Cloudflare Workers** via OpenNext. **Cloudflare D1** (SQLite) is the
source of truth. Two systems, one job each:

| Concern | System | Trigger | Does |
|---|---|---|---|
| **CI (tests)** | GitHub Actions — `.github/workflows/ci.yml` | PRs into `main`, pushes to `main` | `npm ci` → typecheck → Vitest → OpenNext build. No deploy, no credentials. |
| **CD (deploy)** | **Cloudflare Workers Builds** (Git integration) | push to `main` (+ PR preview builds) | Builds with OpenNext and deploys the Worker. Configured in the Cloudflare dashboard. |

> Deployment is owned by **Cloudflare Workers Builds**, not GitHub Actions. (An Actions
> deploy workflow was intentionally removed so the two don't double-deploy.)

## Recommended: gate deploys with branch protection

Workers Builds deploys whatever lands on `main` regardless of the CI result. To keep a
real test gate, protect `main`:

GitHub → repo **Settings → Branches → Add branch ruleset** for `main`:
- Require a pull request before merging.
- Require status checks to pass → select **“Typecheck · test · build”**.

Now only test-passing code reaches `main`, and Workers Builds deploys it.

## Cloudflare Workers Builds — dashboard config

Cloudflare dashboard → **Workers → l-health → Settings → Builds**. This is where the
build/deploy commands live (they are NOT in the repo). For this OpenNext app set:

- **Build command:** `npx opennextjs-cloudflare build`
- **Deploy command:** `npx opennextjs-cloudflare deploy`
- **Root directory:** `/`
- **Production branch:** `main`
- **Node version:** picked up from `.nvmrc` (currently `24`).
- **D1 migrations on deploy (optional but recommended):** prefix the build command:
  `npm run db:migrate:remote && npx opennextjs-cloudflare build`
  (Workers Builds runs with the account's credentials, so `wrangler` is already
  authenticated — no API token needed there.)

A wrong build command (e.g. the default `npx wrangler deploy` without first running the
OpenNext build) is the usual cause of a failed Workers Build, because `.open-next/worker.js`
won't exist yet.

## Application / Worker secrets

Set once as **Worker secrets** (persist across deploys; not in any pipeline):

- `BETTER_AUTH_SECRET` — session/cookie signing secret.
- `BETTER_AUTH_URL` — public origin (production Worker URL).
- `INVITE_CODE` — *optional* master/break-glass sign-up code. The primary gate is the
  per-person `invites` table (codes minted from the dashboard, single-use, revocable);
  leave `INVITE_CODE` unset to require a per-person code for every sign-up.
- `RESEND_API_KEY` — Resend API key for transactional email (password reset + verification).
- `RESEND_FROM` — *optional* sender, e.g. `L Health <noreply@yourdomain>`. Defaults to
  `onboarding@resend.dev`, which only delivers to the Resend account owner until you verify
  a sending domain (see backlog issue: "Verify a Resend sending domain").

`wrangler secret put <NAME>`. Local dev reads the same names from `.dev.vars` (gitignored).

## Manual deploy (fallback)

From a clean checkout with a Cloudflare API token in your environment
(`CLOUDFLARE_API_TOKEN`; `account_id` is in `wrangler.jsonc`):

```bash
npm ci
npm run db:migrate:remote   # apply pending D1 migrations
npm run deploy              # opennextjs-cloudflare build && deploy
```

(The token is only needed for local/manual deploys — Workers Builds and CI do not use it.)

## Rollback

- **Code:** `git revert <sha> && git push` — Workers Builds redeploys the previous state.
- **Immediate:** `npx wrangler rollback` (revert the Worker to the previous version), or
  re-run the build for a known-good commit from the Workers Builds dashboard.
- D1 migrations are forward-only — undo schema changes with a new migration.
