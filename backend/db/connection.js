const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'app.db');

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
}

function persist() {
  if (!db) return;
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

async function initDb() {
  if (db) return db;
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new SQL.Database();
    initSchema(db);
    persist();
  }
  ensureWardrobeSchema(db);
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() at startup.');
  }
  return db;
}

module.exports = { getDb, initSchema, ensureWardrobeSchema, initDb, persist };
