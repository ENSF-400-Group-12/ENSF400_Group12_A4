require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const authRouter = require('./routes/auth');
const { initDb } = require('./db/connection');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
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
