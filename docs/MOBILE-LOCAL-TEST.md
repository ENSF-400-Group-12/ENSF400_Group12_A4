# Test on your phone without deploying

Use the **same Wi‑Fi** as your computer so your phone can reach your dev machine.

## 1. Backend (API)

From the repo root:

```bash
cd backend
```

Set in `backend/.env` (or shell) so the API accepts your LAN origin and cookies work on HTTP:

- `FRONTEND_ORIGIN=http://YOUR_PC_LAN_IP:3000` (comma‑separate if you need more)
- For local HTTP dev: `NODE_ENV=development`, `SESSION_COOKIE_SECURE=0`, `TRUST_PROXY=0`

Start listening on all interfaces:

**Windows (PowerShell):**

```powershell
$env:LISTEN_HOST="0.0.0.0"
$env:PORT="8080"
npm start
```

**macOS / Linux:**

```bash
LISTEN_HOST=0.0.0.0 PORT=8080 npm start
```

## 2. Frontend (React)

Point the app at your PC’s API URL:

**Windows (PowerShell):**

```powershell
cd frontend
$env:HOST="0.0.0.0"
$env:REACT_APP_API_URL="http://YOUR_PC_LAN_IP:8080"
npm start
```

**macOS / Linux:**

```bash
cd frontend
HOST=0.0.0.0 REACT_APP_API_URL=http://YOUR_PC_LAN_IP:8080 npm start
```

Find `YOUR_PC_LAN_IP`:

- Windows: `ipconfig` → IPv4 under your active adapter
- macOS: System Settings → Network, or `ipconfig getifaddr en0`

## 3. On the phone

Open:

`http://YOUR_PC_LAN_IP:3000`

Allow through **Windows Firewall** if prompted (Node / port 3000 and 8080).

## Optional: HTTPS tunnel

If you need HTTPS (e.g. to mimic secure cookies), use **ngrok**, **Cloudflare Tunnel**, or similar to expose `localhost:3000` and set `FRONTEND_ORIGIN` / `REACT_APP_API_URL` to the tunnel URLs.
