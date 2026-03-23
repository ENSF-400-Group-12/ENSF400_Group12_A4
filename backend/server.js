const path = require('path');
const { loadAllEnv, logEnvBootstrap } = require('./lib/loadEnv');
loadAllEnv();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { getUploadsDir, getDataDir, getDbPath, ensureDir } = require('./lib/storageConfig');
const {
  resolveSessionSecret,
  sessionCookieSecure,
  sessionCookieSameSite,
  trustProxyEnabled,
} = require('./lib/sessionConfig');
const authRouter = require('./routes/auth');
const itemsRouter = require('./routes/items');
const outfitsRouter = require('./routes/outfits');
const demoRouter = require('./routes/demo');
const { initDb } = require('./db/connection');

const app = express();
const port = Number(process.env.PORT) || 8080;
/** Bind address: 0.0.0.0 is required for many hosts (including Railway) to accept external traffic. */
const listenHost = String(process.env.LISTEN_HOST || '0.0.0.0').trim() || '0.0.0.0';

const dataDirAbs = path.resolve(getDataDir());
const dbPathAbs = path.resolve(getDbPath());
const uploadsDirAbs = path.resolve(getUploadsDir());
ensureDir(dataDirAbs);
ensureDir(path.dirname(dbPathAbs));
ensureDir(uploadsDirAbs);

let sessionSecret;
try {
  sessionSecret = resolveSessionSecret();
} catch (err) {
  console.error('[fatal]', err.message);
  process.exit(1);
}

if (trustProxyEnabled()) {
  app.set('trust proxy', 1);
}

logEnvBootstrap(port, {
  nodeEnv: process.env.NODE_ENV || 'development',
  listenHost,
  dataDir: dataDirAbs,
  dbPath: dbPathAbs,
  uploadsDir: uploadsDirAbs,
  trustProxy: trustProxyEnabled(),
  sessionCookieSecure: sessionCookieSecure(),
});

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:13000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:13000',
];
function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '').toLowerCase();
}

const allowedOrigins = (
  process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
    : defaultOrigins
).map(normalizeOrigin);
const allowedOriginSet = new Set(allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    const normalizedOrigin = normalizeOrigin(origin);
    callback(null, allowedOriginSet.has(normalizedOrigin));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
// Do not parse body as JSON for multipart (leave stream for multer)
app.use((req, res, next) => {
  if (req.is('multipart/form-data')) return next();
  express.json()(req, res, next);
});

app.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    service: 'closetai-api',
    env: process.env.NODE_ENV || 'development',
    port,
    listenHost,
    uptimeSeconds: Math.floor(process.uptime()),
    paths: {
      dataDir: dataDirAbs,
      dbPath: dbPathAbs,
      uploadsDir: uploadsDirAbs,
    },
    session: {
      store: 'memory',
      cookieSecure: sessionCookieSecure(),
      trustProxy: trustProxyEnabled(),
    },
  });
});

app.use('/uploads', express.static(getUploadsDir()));
app.use(cookieParser());
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: sessionCookieSameSite(),
    secure: sessionCookieSecure(),
  },
}));

app.get('/', (req, res) => {
  res.send('ClosetAI API');
});

app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/outfits', outfitsRouter);
app.use('/api/demo', demoRouter);

async function start() {
  try {
    await initDb();
    console.log('Database ready.');
  } catch (err) {
    console.error('DB init error:', err.message);
    process.exit(1);
  }
  app.listen(port, listenHost, () => {
    const displayHost = listenHost === '0.0.0.0' ? 'localhost' : listenHost;
    console.log(`Server listening on http://${displayHost}:${port} (bound ${listenHost}:${port})`);
  });
}

start();
