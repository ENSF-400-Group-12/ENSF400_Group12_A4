/**
 * Dev/demo convenience: seed current user's wardrobe from clothes-demo-manifest.
 * Requires auth.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb, persist } = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
const MANIFEST_PATH = path.join(__dirname, '../../frontend/public/clothes-demo-manifest.json');

router.post('/seed', requireAuth, (req, res) => {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) {
      return res.status(404).json({ error: 'Demo manifest not found. Run npm run normalize-clothes first.' });
    }
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const db = getDb();
    const userId = req.session.userId;

    db.run('DELETE FROM wardrobe_items WHERE user_id = $uid', { $uid: userId });

    for (const item of manifest) {
      db.run(
        `INSERT INTO wardrobe_items (user_id, type, color, season, style, notes, image_path)
         VALUES ($uid, $type, $color, $season, $style, $notes, $path)`,
        {
          $uid: userId,
          $type: item.type,
          $color: item.color,
          $season: item.season,
          $style: item.style,
          $notes: item.notes || '',
          $path: item.imagePath,
        }
      );
    }
    persist();
    res.json({ ok: true, count: manifest.length });
  } catch (err) {
    console.error('Demo seed error:', err);
    res.status(500).json({ error: 'Failed to seed demo wardrobe.' });
  }
});

module.exports = router;
