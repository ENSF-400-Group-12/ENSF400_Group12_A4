/**
 * Load .env files reliably (UTF-8 BOM, UTF-16 LE often produced by Windows editors).
 * Does not override variables already set in the environment.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function decodeEnvText(buf) {
  if (!buf || buf.length === 0) return '';
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.slice(2).toString('utf16le');
  }
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return text;
}

function applyParsed(parsed) {
  let n = 0;
  for (const key of Object.keys(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = parsed[key];
      n += 1;
    }
  }
  return n;
}

/**
 * @returns {{ path: string, bytes: number, varsApplied: number }[]}
 */
function loadAllEnv() {
  const candidates = [
    path.resolve(__dirname, '..', '..', '.env'),
    path.resolve(__dirname, '..', '.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  const results = [];
  const seen = new Set();
  for (const absPath of candidates) {
    const norm = path.normalize(absPath);
    if (seen.has(norm)) continue;
    seen.add(norm);
    if (!fs.existsSync(norm)) {
      results.push({ path: norm, bytes: 0, varsApplied: 0, missing: true });
      continue;
    }
    const buf = fs.readFileSync(norm);
    if (buf.length === 0) {
      console.warn('[env] Skipping empty file:', norm);
      results.push({ path: norm, bytes: 0, varsApplied: 0, missing: false, empty: true });
      continue;
    }
    const text = decodeEnvText(buf);
    const parsed = dotenv.parse(text);
    const varsApplied = applyParsed(parsed);
    results.push({ path: norm, bytes: buf.length, varsApplied, missing: false });
  }
  return results;
}

function readCommitForLog() {
  const candidates = [
    process.env.GIT_COMMIT_SHA,
    process.env.GITHUB_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.COMMIT_REF,
    process.env.RAILWAY_GIT_COMMIT_SHA,
  ];
  for (const c of candidates) {
    if (c && String(c).trim()) {
      const s = String(c).trim();
      return s.length > 12 ? s.slice(0, 12) : s;
    }
  }
  return 'unknown';
}

/**
 * @param {number|string} port
 * @param {object} [runtime] Safe, non-secret runtime diagnostics for logs
 * @param {string} [runtime.nodeEnv]
 * @param {string} [runtime.listenHost]
 * @param {string} [runtime.dataDir]
 * @param {string} [runtime.dbPath]
 * @param {string} [runtime.uploadsDir]
 * @param {boolean} [runtime.trustProxy]
 * @param {boolean} [runtime.sessionCookieSecure]
 */
function logEnvBootstrap(port, runtime = {}) {
  const keyOk = Boolean(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim());
  const gitShort = readCommitForLog();
  let nodeEnv = process.env.NODE_ENV || 'development';
  if (runtime.nodeEnv !== undefined && runtime.nodeEnv !== null) {
    nodeEnv = runtime.nodeEnv;
  }
  console.log('[boot] ClosetAI backend git=%s NODE_ENV=%s PORT=%s', gitShort, nodeEnv, port);
  if (runtime.listenHost != null) {
    console.log('[boot] listen host=%s (set LISTEN_HOST to override)', runtime.listenHost);
  }
  if (runtime.dataDir) console.log('[boot] data dir=%s', runtime.dataDir);
  if (runtime.dbPath) console.log('[boot] database file=%s', runtime.dbPath);
  if (runtime.uploadsDir) console.log('[boot] uploads dir=%s', runtime.uploadsDir);
  if (runtime.trustProxy != null) {
    console.log('[boot] trust proxy=%s (TRUST_PROXY)', runtime.trustProxy ? 'on' : 'off');
  }
  if (runtime.sessionCookieSecure != null) {
    console.log('[boot] session cookie secure=%s (SESSION_COOKIE_SECURE / NODE_ENV)', runtime.sessionCookieSecure ? 'on' : 'off');
  }
  console.log('[boot] session store=memory (single instance; not for horizontal scale)');
  console.log('[boot] Mounted: /api/auth /api/items /api/outfits /api/demo');
  console.log('[boot] OPENAI_API_KEY loaded: %s', keyOk ? 'yes' : 'no');
  if (!keyOk) {
    console.warn(
      '[boot] Vision analysis disabled until OPENAI_API_KEY is set (repo-root .env, UTF-8).'
    );
  }
}

module.exports = { loadAllEnv, logEnvBootstrap, decodeEnvText };
