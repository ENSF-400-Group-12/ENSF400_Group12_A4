# Playwright E2E (F1 / F2 / F3)

## Run

From repo root:

```bash
cd e2e
npm install
npx playwright install chromium   # once
set CI=1                          # Windows: force fresh servers (recommended)
npx playwright test
```

Or with servers already running on **default** ports (3000 + 8080), set `BASE_URL` and do **not** rely on `webServer` (comment it out or use `reuseExistingServer`).

## Isolated ports (default in `playwright.config.js`)

- Backend: `18080` (`PORT` env in webServer)
- Frontend: `13000` (`PORT` + `REACT_APP_PROXY_TARGET=http://localhost:18080`)
- CORS: backend allows `http://localhost:13000` (see `FRONTEND_ORIGIN` in config + `server.js` default list)

This avoids collisions with a dev stack on 3000/8080 and avoids proxying to a stale backend without `/api/demo`.

## What is covered

- Signup → insufficient outfit message → load demo wardrobe → generate → results
- Add item with bundled demo WEBP → dashboard card

## OpenAI

E2E does not require `OPENAI_API_KEY`. Analysis and outfit rerank fall back when the key is absent.

## Env template

See `backend/.env.example` for optional AI variables.
