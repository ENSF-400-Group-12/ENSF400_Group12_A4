const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { generateOutfit } = require('../services/outfitGenerator');
const { getDb, persist } = require('../db/connection');

const router = express.Router();
router.use(requireAuth);

const MAX_LEN = {
  occasion: 80,
  vibe: 80,
  explanation: 8000,
  stylistConfidence: 40,
  type: 80,
  color: 80,
  season: 80,
  style: 80,
  notes: 500,
  imagePath: 500,
  createdAt: 40,
};
const MAX_JSON = 130000;

function rowsToObjects(execResult) {
  if (!execResult.length || !execResult[0].values.length) return [];
  const { columns, values } = execResult[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });
}

function getSelectResult(db, sql, params) {
  const result = db.exec(sql, params);
  if (!result.length || !result[0].values.length) return null;
  const row = result[0].values[0];
  const cols = result[0].columns;
  const obj = {};
  cols.forEach((c, i) => { obj[c] = row[i]; });
  return obj;
}

/**
 * Normalize API outfit shape for storage; drops unknown fields.
 * @returns {{ error?: string, outfit?: object }}
 */
function sanitizeFavoriteOutfit(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid outfit data.' };
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return { error: 'Outfit must include at least one item.' };
  }

  const items = [];
  for (const it of body.items) {
    if (!it || typeof it !== 'object') {
      return { error: 'Invalid item in outfit.' };
    }
    const id = typeof it.id === 'number' && Number.isFinite(it.id)
      ? it.id
      : parseInt(it.id, 10);
    if (!Number.isFinite(id)) {
      return { error: 'Each item must have a valid id.' };
    }
    const type = String(it.type || '').trim().slice(0, MAX_LEN.type);
    if (!type) {
      return { error: 'Each item must have a type.' };
    }
    items.push({
      id,
      type,
      color: String(it.color || '').trim().slice(0, MAX_LEN.color),
      season: it.season != null ? String(it.season).trim().slice(0, MAX_LEN.season) : '',
      style: it.style != null ? String(it.style).trim().slice(0, MAX_LEN.style) : '',
      notes: it.notes != null ? String(it.notes).trim().slice(0, MAX_LEN.notes) : '',
      image_path: it.image_path != null ? String(it.image_path).trim().slice(0, MAX_LEN.imagePath) : null,
      created_at: it.created_at != null ? String(it.created_at).slice(0, MAX_LEN.createdAt) : null,
    });
  }

  const outfit = {
    occasion: body.occasion != null ? String(body.occasion).trim().slice(0, MAX_LEN.occasion) : '',
    vibe: body.vibe != null ? String(body.vibe).trim().slice(0, MAX_LEN.vibe) : '',
    explanation: body.explanation != null ? String(body.explanation).trim().slice(0, MAX_LEN.explanation) : '',
    reranked: Boolean(body.reranked),
    stylistConfidence: body.stylistConfidence != null
      ? String(body.stylistConfidence).trim().slice(0, MAX_LEN.stylistConfidence)
      : null,
    items,
  };

  const json = JSON.stringify(outfit);
  if (json.length > MAX_JSON) {
    return { error: 'Outfit data is too large.' };
  }

  return { outfit };
}

router.get('/favorites', (req, res) => {
  try {
    const db = getDb();
    const rows = rowsToObjects(
      db.exec(
        'SELECT id, payload, created_at FROM favorite_outfits WHERE user_id = $uid ORDER BY datetime(created_at) DESC',
        { $uid: req.session.userId }
      )
    );
    const favorites = rows.map((row) => {
      let parsed;
      try {
        parsed = JSON.parse(row.payload);
      } catch (_) {
        parsed = { items: [], occasion: '', vibe: '', explanation: '' };
      }
      return {
        id: row.id,
        created_at: row.created_at,
        ...parsed,
      };
    });
    res.json({ favorites });
  } catch (err) {
    console.error('Favorites list error:', err);
    res.status(500).json({ error: 'Failed to load favorites.' });
  }
});

router.post('/favorites', express.json(), (req, res) => {
  const { error, outfit } = sanitizeFavoriteOutfit(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const db = getDb();
    const payload = JSON.stringify(outfit);
    db.run(
      'INSERT INTO favorite_outfits (user_id, payload) VALUES ($uid, $payload)',
      { $uid: req.session.userId, $payload: payload }
    );
    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const id = (idResult && idResult[0] && idResult[0].values && idResult[0].values[0])
      ? idResult[0].values[0][0]
      : null;
    if (id == null) {
      return res.status(500).json({ error: 'Could not save favorite. Try again.' });
    }
    persist();
    const row = getSelectResult(
      db,
      'SELECT id, created_at FROM favorite_outfits WHERE id = $id',
      { $id: id }
    );
    res.status(201).json({
      favorite: {
        id: row.id,
        created_at: row.created_at,
        ...outfit,
      },
    });
  } catch (err) {
    console.error('Favorite save error:', err);
    res.status(500).json({ error: 'Failed to save favorite.' });
  }
});

router.delete('/favorites/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid favorite id.' });
  }

  try {
    const db = getDb();
    const row = getSelectResult(
      db,
      'SELECT id, user_id FROM favorite_outfits WHERE id = $id',
      { $id: id }
    );
    if (!row) {
      return res.status(404).json({ error: 'Favorite not found.' });
    }
    if (row.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'You can only remove your own favorites.' });
    }
    db.run('DELETE FROM favorite_outfits WHERE id = $id', { $id: id });
    persist();
    res.status(204).send();
  } catch (err) {
    console.error('Favorite delete error:', err);
    res.status(500).json({ error: 'Failed to remove favorite.' });
  }
});

router.post('/generate', express.json(), async (req, res) => {
  const occasion = (req.body.occasion && String(req.body.occasion).trim()) || '';
  const vibe = (req.body.vibe && String(req.body.vibe).trim()) || '';

  if (!occasion || !vibe) {
    return res.status(400).json({ error: 'Occasion and vibe are required.' });
  }

  try {
    const result = await generateOutfit(req.session.userId, occasion, vibe);
    if (result.error) {
      return res.status(422).json({
        error: result.error,
        suggestion: result.suggestion || null,
      });
    }
    res.json(result);
  } catch (err) {
    console.error('Outfit generate error:', err);
    res.status(500).json({ error: 'Outfit generation failed. Please try again.' });
  }
});

module.exports = router;
