const fs = require('fs');
const path = require('path');
const { getDataDir, getDbPath, ensureDir } = require('../lib/storageConfig');

let db = null;
let SQL = null;

function initSchema(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  database.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
}

function ensureWardrobeSchema(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS wardrobe_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      season TEXT NOT NULL,
      style TEXT NOT NULL,
      notes TEXT,
      image_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  database.run(`CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_id ON wardrobe_items(user_id)`);
  ensureGarmentProfileColumn(database);
}

function ensureGarmentProfileColumn(database) {
  try {
    const info = database.exec('PRAGMA table_info(wardrobe_items)');
    if (!info.length || !info[0].values.length) return;
    const nameIdx = info[0].columns.indexOf('name');
    if (nameIdx < 0) return;
    const hasProfile = info[0].values.some((row) => row[nameIdx] === 'garment_profile');
    if (!hasProfile) {
      database.run('ALTER TABLE wardrobe_items ADD COLUMN garment_profile TEXT');
    }
  } catch (err) {
    console.warn('[db] garment_profile migration:', err.message);
  }
}

function ensureFavoriteOutfitsSchema(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS favorite_outfits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  database.run(`CREATE INDEX IF NOT EXISTS idx_favorite_outfits_user_id ON favorite_outfits(user_id)`);
}

function persist() {
  if (!db) return;
  const dbPath = getDbPath();
  ensureDir(path.dirname(dbPath));
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

async function initDb() {
  if (db) return db;
  const dbPath = getDbPath();
  ensureDir(path.dirname(dbPath));
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    initSchema(db);
    ensureWardrobeSchema(db);
    ensureFavoriteOutfitsSchema(db);
    persist();
  } else {
    db = new SQL.Database();
    initSchema(db);
    ensureWardrobeSchema(db);
    ensureFavoriteOutfitsSchema(db);
    persist();
  }
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() at startup.');
  }
  return db;
}

module.exports = { getDb, initSchema, ensureWardrobeSchema, ensureFavoriteOutfitsSchema, initDb, persist };
