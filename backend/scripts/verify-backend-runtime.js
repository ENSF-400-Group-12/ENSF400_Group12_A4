/**
 * Print resolved storage paths and env mode without starting the HTTP server.
 * Run from repo root: npm run verify:runtime --prefix backend
 * Or: cd backend && npm run verify:runtime
 */

const path = require('node:path');
const fs = require('node:fs');

const backendRoot = path.resolve(__dirname, '..');
process.chdir(backendRoot);

const { loadAllEnv } = require('../lib/loadEnv');
const { getDataDir, getDbPath, getUploadsDir, ensureDir } = require('../lib/storageConfig');

loadAllEnv();

const dataDir = path.resolve(getDataDir());
const dbPath = path.resolve(getDbPath());
const uploadsDir = path.resolve(getUploadsDir());

ensureDir(dataDir);
ensureDir(path.dirname(dbPath));
ensureDir(uploadsDir);

const out = {
  ok: true,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 8080,
  listenHost: String(process.env.LISTEN_HOST || '0.0.0.0').trim() || '0.0.0.0',
  paths: {
    dataDir,
    dbPath,
    uploadsDir,
  },
  dbFileExists: fs.existsSync(dbPath),
  uploadsWritable: (() => {
    try {
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  })(),
};

// eslint-disable-next-line no-console
console.log(JSON.stringify(out, null, 2));
