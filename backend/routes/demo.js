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

function resolveManifestPath() {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'frontend', 'public', 'clothes-demo-manifest.json'),
    path.resolve(process.cwd(), 'frontend', 'public', 'clothes-demo-manifest.json'),
    path.resolve(process.cwd(), '..', 'frontend', 'public', 'clothes-demo-manifest.json'),
    path.join(__dirname, '..', 'data', 'clothes-demo-manifest.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {
      /* ignore */
    }
  }
  return null;
}

/** Public health check for demo assets (no secrets). */
router.get('/status', (_req, res) => {
  try {
    const p = resolveManifestPath();
    res.json({
      manifestExists: Boolean(p),
    });
  } catch (err) {
    res.status(500).json({ error: 'Status check failed.' });
  }
});

router.post('/seed', requireAuth, (req, res) => {
  try {
    const manifestPath = resolveManifestPath();
    if (!manifestPath) {
      return res.status(404).json({
        error:
          'Demo manifest not found. From repo root run: cd backend && npm run normalize-clothes',
      });
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
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
    const msg = process.env.NODE_ENV === 'development' ? err.message : 'Failed to seed demo wardrobe.';
    res.status(500).json({ error: msg });
  }
});

module.exports = router;
