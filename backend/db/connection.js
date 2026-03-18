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
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() at startup.');
  }
  return db;
}

module.exports = { getDb, initSchema, initDb, persist };
