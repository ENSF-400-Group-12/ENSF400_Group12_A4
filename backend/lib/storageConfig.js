/**
 * Central place for filesystem paths used by DB and uploads.
 * Override with env vars so a single deploy can point DB + uploads at persistent volumes.
 *
 * - CLOSETAI_DATA_DIR: directory for SQLite file (default: backend/data)
 * - CLOSETAI_DATABASE_PATH: full path to .db file (overrides data dir + app.db)
 * - CLOSETAI_UPLOAD_DIR: user image uploads (default: backend/uploads)
 *
 * Paths are resolved from process.cwd() when relative.
 */

const path = require('path');
const fs = require('fs');

const backendRoot = path.resolve(__dirname, '..');

function resolvePath(raw, fallbackAbsolute) {
  if (raw == null || String(raw).trim() === '') {
    return fallbackAbsolute;
  }
  const s = String(raw).trim();
  return path.isAbsolute(s) ? s : path.resolve(process.cwd(), s);
}

function getDataDir() {
  return resolvePath(process.env.CLOSETAI_DATA_DIR, path.join(backendRoot, 'data'));
}

function getDbPath() {
  const raw = process.env.CLOSETAI_DATABASE_PATH;
  if (raw != null && String(raw).trim() !== '') {
    const s = String(raw).trim();
    return path.isAbsolute(s) ? s : path.resolve(process.cwd(), s);
  }
  return path.join(getDataDir(), 'app.db');
}

function getUploadsDir() {
  return resolvePath(process.env.CLOSETAI_UPLOAD_DIR, path.join(backendRoot, 'uploads'));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = {
  getDataDir,
  getDbPath,
  getUploadsDir,
  ensureDir,
  backendRoot,
};
