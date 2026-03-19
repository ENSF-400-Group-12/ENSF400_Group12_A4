require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const authRouter = require('./routes/auth');
const itemsRouter = require('./routes/items');
const outfitsRouter = require('./routes/outfits');
const demoRouter = require('./routes/demo');
const { initDb } = require('./db/connection');

const app = express();
const port = process.env.PORT || 8080;

const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3001'];

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
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'closetai-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

app.get('/', (req, res) => {
  res.send('ClosetAI API');
});

app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/outfits', outfitsRouter);
app.use('/api/demo', demoRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
