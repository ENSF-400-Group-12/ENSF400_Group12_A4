# Deploy ClosetAI backend on Railway

This backend is a **long-running Node process** with:

- SQLite database file (`sql.js` persistence)
- Local filesystem image uploads
- Cookie sessions (in-memory session store, single instance)

Railway fits this model when you attach **one persistent volume** and point both the database and uploads at paths **inside that volume**.

## 1. Create the service

1. Create a new **Railway** project and add a service from this repo.
2. Set the **root directory** to `backend` (or set the start command to run from `backend`).
3. **Start command:** `npm start` (runs `node server.js`).
4. **Build command:** leave empty or `npm ci` if Railway asks for install (Railway usually runs `npm install` from `package.json`).

## 2. Attach a persistent volume

1. In the service, add a **Volume**.
2. Choose a mount path, for example `/data`.
3. Use the **same mount** for both database and uploads (simplest):

   | Variable | Example value |
   |----------|----------------|
   | `CLOSETAI_DATA_DIR` | `/data/closetai` |
   | `CLOSETAI_UPLOAD_DIR` | `/data/closetai/uploads` |
   | `CLOSETAI_DATABASE_PATH` | *(optional)* `/data/closetai/app.db` |

If you set only `CLOSETAI_DATA_DIR`, the DB defaults to `<dataDir>/app.db`. You can still override `CLOSETAI_UPLOAD_DIR` to another folder under `/data` if you prefer.

The app creates directories on startup when possible.

## Demo wardrobe (“Load demo wardrobe”)

The backend ships a committed bundle under `backend/demo/` (manifest + WebP images). The API serves images at **`/clothes-demo/*`** so the Vercel app can load them via `REACT_APP_API_URL` (same origin as the API). You do **not** need to run `normalize-clothes` on the server after deploy.

Optional: set `DEMO_MANIFEST_PATH` to an absolute path if you host the manifest outside the repo.

## 3. Required environment variables

### Core

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | Set to `production`. |
| `PORT` | Railway sets this automatically. Do not hardcode. |
| `SESSION_SECRET` | Long random string (required in production, min 32 chars). |
| `FRONTEND_ORIGIN` | Your Vercel app origin(s), comma-separated if multiple. Example: `https://your-app.vercel.app` |
| `APP_BASE_URL` | Public frontend URL used in verification and password reset emails. |

### Proxy and cookies (HTTPS on Railway)

| Variable | Typical production value |
|----------|-------------------------|
| `TRUST_PROXY` | `1` so `req.secure` and secure cookies work behind Railway’s proxy. |
| `SESSION_COOKIE_SECURE` | `1` when users only use HTTPS (recommended for production). |

### Optional listen binding

| Variable | Default | Notes |
|----------|---------|--------|
| `LISTEN_HOST` | `0.0.0.0` | Required shape for many container hosts; override only if you know you need it. |

### Auth email (if you use verification / reset)

See `docs/AUTH-EMAIL-SETUP.md` for `MAILER_MODE`, `RESEND_API_KEY`, `MAIL_FROM`, etc.

### OpenAI (F3 / outfit rerank)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for vision analysis and optional reranking when enabled. |

## 4. Health check

After deploy, open:

`https://<your-railway-service>.up.railway.app/health`

You should see JSON with:

- `status`, `env`, `port`, `listenHost`
- `paths.dataDir`, `paths.dbPath`, `paths.uploadsDir`
- `uptimeSeconds`
- `session` flags (no secrets)

Use this to confirm the service is reading your volume paths correctly.

## 5. CORS and cookies

The API uses **credentials** (`fetch` with cookies). Your Vercel origin must be listed in `FRONTEND_ORIGIN` exactly (scheme + host, no trailing slash).

## 6. Limitations (explicit)

- **Single instance:** Sessions use the default in-memory store. Do not scale this service to multiple replicas without a shared session store (for example Redis) and a deployment plan.
- **Restarts:** Deploys restart the process. Sessions in memory are cleared; users must log in again unless you add a persistent session store.
- **SQLite file:** Keep the DB file on the volume only. Ephemeral disk will lose data on redeploy if paths are wrong.

## 7. Local sanity check

From the `backend` folder:

```bash
npm run verify:runtime
```

Optionally run with production-like paths:

```bash
set CLOSETAI_DATA_DIR=./tmp-data
set CLOSETAI_UPLOAD_DIR=./tmp-uploads
npm run verify:runtime
```

Then start the server and hit `http://localhost:8080/health`.
