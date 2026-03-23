# ClosetAI — deployment and production readiness

This document describes **current architecture limits**, **environment variables**, and **recommended staging/production** steps. It complements `.env.example` and `backend/.env.example`.

## Branch / feature alignment

- **F4 (favorites)** and **F5 (weather-aware generation)** live on `main` in `backend/routes/outfits.js`, `backend/services/outfitGenerator.js`, and related libs.
- Production-hardening work should branch from **latest `origin/main`** so those features stay included.

## What blocks “serverless frontend only” (e.g. Vercel static + no Node API)

- **Sessions** are **cookie-based** with **express-session** and a **server-side store** (default in-memory). A separate **API host** is required; the API is not a static export.
- **SQLite (sql.js + file)** and **multer disk uploads** assume a **writable filesystem** on the **same Node process** as the API.
- **Vercel serverless functions** are a poor fit for: long-lived SQLite files, ephemeral disks, and session affinity unless you redesign (Postgres + S3 + Redis).

**Reasonable first staging target:** one **Node-friendly** host (Railway, Render, Fly.io, EC2, Azure App Service *with persistent disk*, etc.) running **both** API + static files *or* API + CORS to a static CDN.

## Environment variables (backend)

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | Set to `production` for stricter session rules and default `secure` cookies / trust proxy. |
| `SESSION_SECRET` | **Required** in production (min 32 chars). Omit in local dev to get an ephemeral secret (sessions reset on restart). |
| `SESSION_COOKIE_SECURE` | `1` force secure cookies; `0` force off (e.g. HTTP-only lab). If unset, follows `NODE_ENV === production`. |
| `TRUST_PROXY` | `1` / `0` override for `trust proxy` (needed behind TLS-terminating reverse proxies when using secure cookies). |
| `PORT` | HTTP listen port. |
| `FRONTEND_ORIGIN` | Comma-separated browser origins allowed for CORS + credentials. |
| `OPENAI_API_KEY` | Optional; vision + outfit rerank degrade gracefully without it. |
| `CLOSETAI_DATA_DIR` | Directory for SQLite parent folder (default `backend/data`). |
| `CLOSETAI_DATABASE_PATH` | Full path to `.db` file (overrides `CLOSETAI_DATA_DIR` + `app.db`). |
| `CLOSETAI_UPLOAD_DIR` | User uploads directory (default `backend/uploads`). Must match `express.static` + multer. |
| `GIT_COMMIT_SHA` / `GITHUB_SHA` / etc. | Optional; shown in boot log instead of shelling out to `git`. |

## Auth / sessions (current model)

- **No email verification** today (password + session cookie only).
- **Recommendation:** **defer** verification until after **stable hosted API + HTTPS + `SESSION_SECRET` + mail provider** are in place; then add verified-email gate or magic-link as a focused change.

## File uploads

- Images are stored under **`CLOSETAI_UPLOAD_DIR`** with paths like `/uploads/...` served by Express.
- **Production:** plan for **durable object storage** (S3, GCS, Azure Blob) in a later phase; the new path helpers are the first step toward swapping the multer `destination` implementation without changing routes.

## SonarQube / static analysis (local inference)

Without your SonarCloud project key, typical fixes applied in-repo:

- **Hardcoded session secret** removed from default production path; production requires `SESSION_SECRET`.
- **`execSync('git ...')`** removed from boot logging (use CI env vars for commit SHA).
- Duplication / remaining smells: run Sonar on the branch and fix any remaining **new code** issues it reports.

## Email verification

- **Not implemented** in this pass.
- **Why defer:** hosted **SMTP** (or auth provider), **HTTPS**, and **stable session/cookie** behavior should come first so verification links and cookies behave correctly.

## Outfit engine vs local GPU (5080) spike

- **Recommendation:** **productionize the current OpenAI + rule-based path first** (deploy, observability, storage, auth).
- A **5080 local spike** is high engineering risk and does not fix deploy/session/DB/upload gaps; revisit after staging is stable.

## Checklist before first public staging

1. Set `NODE_ENV=production`, `SESSION_SECRET` (32+ random), `FRONTEND_ORIGIN` to real UI origin(s).
2. HTTPS termination + `TRUST_PROXY=1` if behind a reverse proxy.
3. Persistent volume (or single instance) for `CLOSETAI_DATA_DIR` and `CLOSETAI_UPLOAD_DIR`.
4. Smoke-test: signup, login, add item, generate outfit (with weather), favorite save/load.
