const path = require('path');
const { loadAllEnv, logEnvBootstrap } = require('./lib/loadEnv');
loadAllEnv();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { getUploadsDir } = require('./lib/storageConfig');
const { resolveSessionSecret, sessionCookieSecure, trustProxyEnabled } = require('./lib/sessionConfig');
const authRouter = require('./routes/auth');
const itemsRouter = require('./routes/items');
const outfitsRouter = require('./routes/outfits');
const demoRouter = require('./routes/demo');
const { initDb } = require('./db/connection');

const app = express();
const port = process.env.PORT || 8080;

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

logEnvBootstrap(port);

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:13000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:13000',
];
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : defaultOrigins;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
// Do not parse body as JSON for multipart (leave stream for multer)
app.use((req, res, next) => {
  if (req.is('multipart/form-data')) return next();
  express.json()(req, res, next);
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
    sameSite: 'lax',
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
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start();
