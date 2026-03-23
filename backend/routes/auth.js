const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, persist } = require('../db/connection');
const { createRawToken, expiresAtIso, hashToken, isExpired } = require('../lib/authTokens');
const { frontendBaseUrl, sendMail } = require('../services/mailer');

const router = express.Router();

const EMAIL_MIN = 3;
const PASSWORD_MIN = 6;
const VERIFY_EXPIRY_MIN = Number(process.env.EMAIL_VERIFY_EXPIRY_MIN || 60 * 24);
const VERIFY_RESEND_COOLDOWN_SEC = Number(process.env.EMAIL_VERIFY_RESEND_COOLDOWN_SEC || 60);
const RESET_EXPIRY_MIN = Number(process.env.PASSWORD_RESET_EXPIRY_MIN || 30);

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

function mapUser(row) {
  const emailVerified = Boolean(row.email_verified_at);
  return {
    id: row.id,
    email: row.email,
    emailVerified,
    emailVerifiedAt: row.email_verified_at || null,
  };
}

function verificationEmail(token) {
  const base = frontendBaseUrl();
  const link = `${base}/verify-email?token=${encodeURIComponent(token)}`;
  return {
    subject: 'Verify your ClosetAI email',
    text: `Verify your email to finish setting up your ClosetAI account: ${link}`,
    html: `<p>Verify your email to finish setting up your ClosetAI account.</p><p><a href="${link}">Verify email</a></p><p>If you did not request this, you can ignore this email.</p>`,
  };
}

function passwordResetEmail(token) {
  const base = frontendBaseUrl();
  const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    subject: 'Reset your ClosetAI password',
    text: `Use this link to reset your ClosetAI password: ${link}`,
    html: `<p>We received a request to reset your ClosetAI password.</p><p><a href="${link}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  };
}

async function issueVerificationTokenAndSend(db, userId, email) {
  const raw = createRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = expiresAtIso(VERIFY_EXPIRY_MIN);
  const sentAt = new Date().toISOString();
  db.run(
    `UPDATE users
     SET verification_token_hash = $h,
         verification_expires_at = $exp,
         verification_sent_at = $sent
     WHERE id = $id`,
    { $h: tokenHash, $exp: expiresAt, $sent: sentAt, $id: userId }
  );
  const msg = verificationEmail(raw);
  await sendMail({ to: email, subject: msg.subject, text: msg.text, html: msg.html });
}

async function issueResetTokenAndSend(db, userId, email) {
  const raw = createRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = expiresAtIso(RESET_EXPIRY_MIN);
  const sentAt = new Date().toISOString();
  db.run(
    `UPDATE users
     SET reset_token_hash = $h,
         reset_expires_at = $exp,
         reset_sent_at = $sent
     WHERE id = $id`,
    { $h: tokenHash, $exp: expiresAt, $sent: sentAt, $id: userId }
  );
  const msg = passwordResetEmail(raw);
  await sendMail({ to: email, subject: msg.subject, text: msg.text, html: msg.html });
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
      `INSERT INTO users
       (email, password_hash, email_verified_at, verification_token_hash, verification_expires_at, verification_sent_at, reset_token_hash, reset_expires_at, reset_sent_at)
       VALUES ($email, $hash, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
      { $email: emailTrimmed, $hash: password_hash }
    );
    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const userId = idResult[0].values[0][0];

    issueVerificationTokenAndSend(db, userId, emailTrimmed)
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[auth] verification email send failed:', err.message);
      });

    req.session.userId = userId;
    req.session.email = emailTrimmed;
    persist();
    const row = getSelectResult(
      db,
      'SELECT id, email, email_verified_at FROM users WHERE id = $id',
      { $id: userId }
    );
    res.status(201).json({
      user: mapUser(row),
      verificationRequired: true,
      message: 'Account created. Check your email for a verification link.',
    });
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
    const row = getSelectResult(
      db,
      'SELECT id, email, password_hash, email_verified_at FROM users WHERE email = $email',
      { $email: emailTrimmed }
    );
    if (!row) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    req.session.userId = row.id;
    req.session.email = row.email;
    res.json({
      user: mapUser(row),
      verificationRequired: !row.email_verified_at,
    });
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
    return res.json({ user: null });
  }
  try {
    const db = getDb();
    const row = getSelectResult(
      db,
      'SELECT id, email, email_verified_at, verification_sent_at FROM users WHERE id = $id',
      { $id: req.session.userId }
    );
    if (!row) return res.json({ user: null });
    return res.json({ user: mapUser(row) });
  } catch (_) {
    return res.json({
      user: {
        id: req.session.userId,
        email: req.session.email,
        emailVerified: false,
        emailVerifiedAt: null,
      },
    });
  }
});

router.post('/resend-verification', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  try {
    const db = getDb();
    const row = getSelectResult(
      db,
      'SELECT id, email, email_verified_at, verification_sent_at FROM users WHERE id = $id',
      { $id: req.session.userId }
    );
    if (!row) return res.status(401).json({ error: 'Not authenticated.' });
    if (row.email_verified_at) {
      return res.json({ ok: true, message: 'This email is already verified.' });
    }
    const sentTs = row.verification_sent_at ? Date.parse(row.verification_sent_at) : 0;
    const cooldownMs = VERIFY_RESEND_COOLDOWN_SEC * 1000;
    if (sentTs && !Number.isNaN(sentTs) && (Date.now() - sentTs) < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - (Date.now() - sentTs)) / 1000);
      return res.status(429).json({
        error: `Please wait ${waitSec}s before requesting another verification email.`,
      });
    }
    await issueVerificationTokenAndSend(db, row.id, row.email);
    persist();
    return res.json({ ok: true, message: 'Verification email sent.' });
  } catch (err) {
    return res.status(500).json({ error: 'Could not send verification email. Please try again.' });
  }
});

router.post('/verify-email', (req, res) => {
  const rawToken = String((req.body && req.body.token) || '').trim();
  if (!rawToken) return res.status(400).json({ error: 'Verification token is required.' });
  try {
    const db = getDb();
    const tokenHash = hashToken(rawToken);
    const row = getSelectResult(
      db,
      `SELECT id, email, email_verified_at, verification_token_hash, verification_expires_at
       FROM users WHERE verification_token_hash = $hash`,
      { $hash: tokenHash }
    );
    if (!row) return res.status(400).json({ error: 'Verification link is invalid or expired.' });
    if (row.email_verified_at) {
      return res.json({ ok: true, message: 'Email is already verified.' });
    }
    if (isExpired(row.verification_expires_at)) {
      db.run(
        `UPDATE users
         SET verification_token_hash = NULL,
             verification_expires_at = NULL
         WHERE id = $id`,
        { $id: row.id }
      );
      persist();
      return res.status(400).json({ error: 'Verification link is invalid or expired.' });
    }
    const now = new Date().toISOString();
    db.run(
      `UPDATE users
       SET email_verified_at = $now,
           verification_token_hash = NULL,
           verification_expires_at = NULL
       WHERE id = $id`,
      { $now: now, $id: row.id }
    );
    persist();
    return res.json({
      ok: true,
      message: 'Email verified successfully.',
      user: mapUser({ ...row, email_verified_at: now }),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Could not verify email. Please try again.' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const genericResponse = {
    ok: true,
    message: 'If an account exists for that email, a reset link has been sent.',
  };
  const emailRaw = req.body && typeof req.body.email === 'string' ? req.body.email : '';
  const emailTrimmed = emailRaw.trim().toLowerCase();
  if (!validateEmail(emailTrimmed)) return res.json(genericResponse);
  try {
    const db = getDb();
    const row = getSelectResult(
      db,
      'SELECT id, email FROM users WHERE email = $email',
      { $email: emailTrimmed }
    );
    if (!row) return res.json(genericResponse);
    await issueResetTokenAndSend(db, row.id, row.email);
    persist();
    return res.json(genericResponse);
  } catch (err) {
    // Same response to avoid account enumeration signal.
    return res.json(genericResponse);
  }
});

router.post('/reset-password', (req, res) => {
  const rawToken = String((req.body && req.body.token) || '').trim();
  const newPassword = String((req.body && req.body.password) || '');
  if (!rawToken) return res.status(400).json({ error: 'Reset token is required.' });
  if (!validatePassword(newPassword)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  try {
    const db = getDb();
    const tokenHash = hashToken(rawToken);
    const row = getSelectResult(
      db,
      `SELECT id, reset_expires_at
       FROM users
       WHERE reset_token_hash = $hash`,
      { $hash: tokenHash }
    );
    if (!row || isExpired(row.reset_expires_at)) {
      if (row && row.id) {
        db.run(
          'UPDATE users SET reset_token_hash = NULL, reset_expires_at = NULL WHERE id = $id',
          { $id: row.id }
        );
        persist();
      }
      return res.status(400).json({ error: 'Reset link is invalid or expired.' });
    }
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    db.run(
      `UPDATE users
       SET password_hash = $ph,
           reset_token_hash = NULL,
           reset_expires_at = NULL
       WHERE id = $id`,
      { $ph: passwordHash, $id: row.id }
    );
    persist();
    return res.json({ ok: true, message: 'Password reset successful. Please log in.' });
  } catch (err) {
    return res.status(500).json({ error: 'Could not reset password. Please try again.' });
  }
});

module.exports = router;
