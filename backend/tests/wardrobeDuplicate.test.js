const test = require('node:test');
const assert = require('node:assert/strict');

const initSqlJs = require('sql.js');
const { findDuplicateRows } = require('../lib/wardrobeDuplicate');

function makeTable(db) {
  db.run(`
    CREATE TABLE wardrobe_items (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      season TEXT NOT NULL,
      style TEXT NOT NULL,
      notes TEXT,
      image_path TEXT,
      created_at TEXT,
      garment_profile TEXT,
      content_hash TEXT
    )
  `);
}

function insertRow(db, id, type, color = 'Black', style = 'Formal', contentHash = null) {
  db.run(
    `INSERT INTO wardrobe_items
      (id, user_id, type, color, season, style, notes, image_path, created_at, garment_profile, content_hash)
     VALUES ($id, 1, $type, $color, 'All Season', $style, '', '', datetime('now'), null, $hash)`,
    { $id: id, $type: type, $color: color, $style: style, $hash: contentHash }
  );
}

test('duplicate detection treats blouse and shirt as the same similarity family', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  makeTable(db);
  insertRow(db, 1, 'Shirt', 'White', 'Business');

  const result = findDuplicateRows(db, 1, null, 'Blouse', 'White', 'Business');
  assert.deepEqual(result.similar.map((row) => row.id), [1]);
});

test('duplicate detection groups heels with polished shoes and dress boots with boots', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  makeTable(db);
  insertRow(db, 1, 'Shoes', 'Black', 'Formal');
  insertRow(db, 2, 'Boots', 'Burgundy', 'Smart Casual');

  const heelsMatch = findDuplicateRows(db, 1, null, 'Heels', 'Black', 'Formal');
  const dressBootsMatch = findDuplicateRows(db, 1, null, 'Dress Boots', 'Burgundy', 'Smart Casual');

  assert.deepEqual(heelsMatch.similar.map((row) => row.id), [1]);
  assert.deepEqual(dressBootsMatch.similar.map((row) => row.id), [2]);
});

test('duplicate detection keeps exact image matches out of similar results', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  makeTable(db);
  insertRow(db, 1, 'Blouse', 'Black', 'Formal', 'hash-1');
  insertRow(db, 2, 'Shirt', 'Black', 'Formal', null);

  const result = findDuplicateRows(db, 1, 'hash-1', 'Blouse', 'Black', 'Formal');

  assert.deepEqual(result.exact.map((row) => row.id), [1]);
  assert.deepEqual(result.similar.map((row) => row.id), [2]);
});
