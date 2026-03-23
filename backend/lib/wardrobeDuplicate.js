/**
 * Duplicate detection for wardrobe uploads: exact SHA-256 of image bytes,
 * plus a soft metadata match (same type, color, style) for likely duplicates.
 */

const crypto = require('crypto');
const fs = require('fs');

function sha256FileBuffer(absPath) {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function norm(s) {
  return String(s || '').trim().toLowerCase();
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
  const exact = [];
  const similar = [];
  const t = norm(type);
  const c = norm(color);
  const st = norm(style);

  if (contentHash) {
    const rows = db.exec(
      `SELECT id, user_id, type, color, season, style, notes, image_path, created_at, garment_profile, content_hash
       FROM wardrobe_items WHERE user_id = $uid AND content_hash = $h`,
      { $uid: userId, $h: contentHash }
    );
    if (rows.length && rows[0].values.length) {
      const cols = rows[0].columns;
      for (const row of rows[0].values) {
        const o = {};
        cols.forEach((col, i) => { o[col] = row[i]; });
        exact.push(o);
      }
    }
  }

  const simRows = db.exec(
    `SELECT id, user_id, type, color, season, style, notes, image_path, created_at, garment_profile, content_hash
     FROM wardrobe_items
     WHERE user_id = $uid
       AND lower(trim(type)) = $t
       AND lower(trim(color)) = $c
       AND lower(trim(style)) = $s`,
    { $uid: userId, $t: t, $c: c, $s: st }
  );
  const exactIds = new Set(exact.map((e) => e.id));
  if (simRows.length && simRows[0].values.length) {
    const cols = simRows[0].columns;
    for (const row of simRows[0].values) {
      const o = {};
      cols.forEach((col, i) => { o[col] = row[i]; });
      const id = o.id;
      if (exactIds.has(id)) continue;
      const sameHash = contentHash && o.content_hash === contentHash;
      if (!sameHash) {
        similar.push(o);
      }
    }
  }

  return { exact, similar: similar.slice(0, 8) };
}

module.exports = { sha256FileBuffer, findDuplicateRows };
