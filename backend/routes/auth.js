const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, persist } = require('../db/connection');

const router = express.Router();

const EMAIL_MIN = 3;
const PASSWORD_MIN = 6;

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length >= EMAIL_MIN && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function validatePassword(password) {
  return password && typeof password === 'string' && password.length >= PASSWORD_MIN;
}

function getSelectResult(db, sql, params) {
  const result = db.exec(sql, params);
  if (!result.length || !result[0].values.length) return null;
  const row = result[0].values[0];
  const cols = result[0].columns;
  const obj = {};
  cols.forEach((c, i) => { obj[c] = row[i]; });
  return obj;
}

router.post('/signup', (req, res) => {
  const { email, password } = req.body || {};
  const emailTrimmed = email && typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!validateEmail(emailTrimmed)) {
    return res.status(400).json({ error: 'Valid email required (at least 3 characters).' });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const db = getDb();
    const existing = getSelectResult(db, 'SELECT id FROM users WHERE email = $email', { $email: emailTrimmed });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const password_hash = bcrypt.hashSync(password, 10);
    db.run(
      'INSERT INTO users (email, password_hash) VALUES ($email, $hash)',
      { $email: emailTrimmed, $hash: password_hash }
    );
    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const userId = idResult[0].values[0][0];
    persist();
    req.session.userId = userId;
    req.session.email = emailTrimmed;
    res.status(201).json({ user: { id: userId, email: emailTrimmed } });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const emailTrimmed = email && typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!emailTrimmed || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  try {
    const db = getDb();
    const row = getSelectResult(db, 'SELECT id, email, password_hash FROM users WHERE email = $email', { $email: emailTrimmed });
    if (!row) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    req.session.userId = row.id;
    req.session.email = row.email;
    res.json({ user: { id: row.id, email: row.email } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed.' });
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: { id: req.session.userId, email: req.session.email } });
});

module.exports = router;
