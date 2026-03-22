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

function logEnvBootstrap(port) {
  const keyOk = Boolean(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim());
  let gitShort = 'unknown';
  try {
    const { execSync } = require('child_process');
    gitShort = execSync('git rev-parse --short HEAD', {
      cwd: path.resolve(__dirname, '..', '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (_) {
    /* optional */
  }
  console.log('[boot] ClosetAI backend git=%s PORT=%s', gitShort, port);
  console.log('[boot] Mounted: /api/auth /api/items /api/outfits /api/demo');
  console.log('[boot] OPENAI_API_KEY loaded: %s', keyOk ? 'yes' : 'no');
  if (!keyOk) {
    console.warn(
      '[boot] Vision analysis disabled until OPENAI_API_KEY is set (repo-root .env, UTF-8).'
    );
  }
}

module.exports = { loadAllEnv, logEnvBootstrap, decodeEnvText };
