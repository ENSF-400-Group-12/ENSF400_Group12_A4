const express = require('express');
const { getDb, persist } = require('../db/connection');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

function rowsToObjects(execResult) {
  if (!execResult.length || !execResult[0].values.length) return [];
  const { columns, values } = execResult[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });
}

const MAX_LEN = { type: 80, color: 80, season: 80, style: 80, notes: 500 };
function validateItemFields(type, color, season, style, notes) {
  if (!type || !color || !season || !style) {
    return 'Type, color, season, and style are required.';
  }
  if (type.length > MAX_LEN.type) return 'Type is too long.';
  if (color.length > MAX_LEN.color) return 'Color is too long.';
  if (season.length > MAX_LEN.season) return 'Season is too long.';
  if (style.length > MAX_LEN.style) return 'Style is too long.';
  if (notes.length > MAX_LEN.notes) return 'Notes are too long.';
  return null;
}

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = rowsToObjects(
      db.exec('SELECT id, user_id, type, color, season, style, notes, image_path, created_at FROM wardrobe_items WHERE user_id = $uid ORDER BY created_at DESC', {
        $uid: req.session.userId,
      })
    );
    const items = rows.map((r) => ({
      id: r.id,
      type: r.type,
      color: r.color,
      season: r.season,
      style: r.style,
      notes: r.notes ?? '',
      image_path: r.image_path,
      created_at: r.created_at,
    }));
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load wardrobe items.' });
  }
});

router.post('/', express.json(), (req, res) => {
  const type = (req.body.type && req.body.type.trim()) || '';
  const color = (req.body.color && req.body.color.trim()) || '';
  const season = (req.body.season && req.body.season.trim()) || '';
  const style = (req.body.style && req.body.style.trim()) || '';
  const notes = req.body.notes != null ? String(req.body.notes).trim() : '';

  const validationError = validateItemFields(type, color, season, style, notes);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const db = getDb();
    db.run(
      `INSERT INTO wardrobe_items (user_id, type, color, season, style, notes, image_path)
       VALUES ($uid, $type, $color, $season, $style, $notes, $path)`,
      {
        $uid: req.session.userId,
        $type: type,
        $color: color,
        $season: season,
        $style: style,
        $notes: notes,
        $path: null,
      }
    );
    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const id = (idResult && idResult[0] && idResult[0].values && idResult[0].values[0]) ? idResult[0].values[0][0] : null;
    if (id == null) {
      return res.status(500).json({ error: 'Item was not created. Please try again.' });
    }
    persist();
    res.status(201).json({
      item: {
        id,
        type,
        color,
        season,
        style,
        notes,
        image_path: null,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save item.' });
  }
});

module.exports = router;
