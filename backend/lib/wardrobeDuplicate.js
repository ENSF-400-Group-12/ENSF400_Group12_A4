/**
 * Duplicate detection for wardrobe uploads: exact SHA-256 of image bytes,
 * plus a soft metadata match (same type, color, style) for likely duplicates.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');

function sha256FileBuffer(absPath) {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function queryRows(db, sql, params) {
  const rows = db.exec(sql, params);
  if (!rows.length || !rows[0].values.length) return [];
  const cols = rows[0].columns;
  return rows[0].values.map((row) => {
    const out = {};
    cols.forEach((col, i) => { out[col] = row[i]; });
    return out;
  });
}

/**
 * @param {import('sql.js').Database} db
 * @param {number} userId
 * @param {string|null} contentHash sha256 hex or null
 * @param {string} type
 * @param {string} color
 * @param {string} style
 * @returns {{ exact: object[], similar: object[] }} raw row objects from wardrobe_items
 */
function findDuplicateRows(db, userId, contentHash, type, color, style) {
  const t = norm(type);
  const c = norm(color);
  const st = norm(style);

  const exact = contentHash
    ? queryRows(
      db,
      `SELECT id, user_id, type, color, season, style, notes, image_path, created_at, garment_profile, content_hash
       FROM wardrobe_items WHERE user_id = $uid AND content_hash = $h`,
      { $uid: userId, $h: contentHash }
    )
    : [];

  const simRows = queryRows(
    db,
    `SELECT id, user_id, type, color, season, style, notes, image_path, created_at, garment_profile, content_hash
     FROM wardrobe_items
     WHERE user_id = $uid
       AND lower(trim(type)) = $t
       AND lower(trim(color)) = $c
       AND lower(trim(style)) = $s`,
    { $uid: userId, $t: t, $c: c, $s: st }
  );
  const exactIds = new Set(exact.map((e) => e.id));
  const similar = simRows.filter((row) => {
    if (exactIds.has(row.id)) return false;
    return !(contentHash && row.content_hash === contentHash);
  });

  return { exact, similar: similar.slice(0, 8) };
}

module.exports = { sha256FileBuffer, findDuplicateRows };
