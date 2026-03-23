/**
 * Demo convenience: seed current user's wardrobe from a committed manifest + static images.
 */
const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { getDb, persist } = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

/** Backend-owned bundle (deploys with Railway/backend image). */
const COMMITTED_MANIFEST = path.join(__dirname, '..', 'demo', 'clothes-demo-manifest.json');
const DEMO_SECTIONS = new Set(['mens', 'womens']);

function normalizeDemoSection(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'all';
  return DEMO_SECTIONS.has(raw) ? raw : null;
}

/**
 * Resolve demo manifest path. Order: DEMO_MANIFEST_PATH, committed backend/demo, monorepo fallbacks.
 * @returns {{ path: string | null, checked: string[] }}
 */
function resolveManifestPath() {
  const checked = [];

  const tryFile = (absPath) => {
    const resolved = path.resolve(absPath);
    checked.push(resolved);
    try {
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        return resolved;
      }
    } catch (err) {
      console.warn('[demo] manifest stat error:', resolved, err.message);
    }
    return null;
  }

  const envOverride = String(process.env.DEMO_MANIFEST_PATH || '').trim();
  if (envOverride) {
    const found = tryFile(envOverride);
    if (found) return { path: found, checked };
  }

  const primary = tryFile(COMMITTED_MANIFEST);
  if (primary) return { path: primary, checked };

  const fallbacks = [
    path.join(__dirname, '..', '..', 'frontend', 'public', 'clothes-demo-manifest.json'),
    path.join(process.cwd(), 'frontend', 'public', 'clothes-demo-manifest.json'),
    path.join(process.cwd(), '..', 'frontend', 'public', 'clothes-demo-manifest.json'),
    path.join(process.cwd(), 'backend', 'demo', 'clothes-demo-manifest.json'),
    path.join(process.cwd(), 'demo', 'clothes-demo-manifest.json'),
  ];
  for (const rel of fallbacks) {
    const found = tryFile(rel);
    if (found) return { path: found, checked };
  }

  return { path: null, checked };
}

/** Public health check for demo assets (no secrets). */
router.get('/status', (_req, res) => {
  try {
    const { path: manifestPath, checked } = resolveManifestPath();
    const demoDir = path.join(__dirname, '..', 'demo', 'clothes-demo');
    let demoImageCount = 0;
    try {
      if (fs.existsSync(demoDir) && fs.statSync(demoDir).isDirectory()) {
        demoImageCount = fs.readdirSync(demoDir).filter((f) => f.toLowerCase().endsWith('.webp')).length;
      }
    } catch (err) {
      console.warn('[demo/status] clothes-demo dir:', err.message);
    }
    const payload = {
      manifestExists: Boolean(manifestPath),
      demoImageCount,
    };
    if (process.env.NODE_ENV !== 'production') {
      payload.resolvedManifestPath = manifestPath || null;
      payload.checkedPaths = checked;
    }
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Status check failed.', code: 'DEMO_STATUS_ERROR' });
  }
});

router.post('/seed', requireAuth, (req, res) => {
  try {
    const requestedSection = normalizeDemoSection(req.body?.section);
    if (requestedSection == null) {
      return res.status(400).json({
        error: 'Demo section must be "mens" or "womens".',
        code: 'DEMO_SECTION_INVALID',
      });
    }
    const { path: manifestPath, checked } = resolveManifestPath();
    if (!manifestPath) {
      console.warn('[demo/seed] manifest not found; checked paths:', checked.length);
      const body = {
        error: 'Demo wardrobe bundle is not available on this server.',
        code: 'DEMO_MANIFEST_MISSING',
      };
      if (process.env.NODE_ENV !== 'production') {
        body.checkedPaths = checked;
      }
      return res.status(422).json(body);
    }

    let manifest;
    try {
      const raw = fs.readFileSync(manifestPath, 'utf8');
      manifest = JSON.parse(raw);
    } catch (parseErr) {
      console.error('[demo/seed] invalid manifest:', manifestPath, parseErr.message);
      return res.status(422).json({
        error: 'Demo manifest is invalid or unreadable.',
        code: 'DEMO_MANIFEST_INVALID',
      });
    }

    if (!Array.isArray(manifest) || manifest.length === 0) {
      return res.status(422).json({
        error: 'Demo manifest is empty.',
        code: 'DEMO_MANIFEST_EMPTY',
      });
    }

    const filteredManifest = requestedSection === 'all'
      ? manifest
      : manifest.filter((item) => String(item.demoSection || 'mens').toLowerCase() === requestedSection);

    if (filteredManifest.length === 0) {
      return res.status(422).json({
        error: 'This demo wardrobe section is empty on the server.',
        code: 'DEMO_SECTION_EMPTY',
      });
    }

    const db = getDb();
    const userId = req.session.userId;

    db.run('DELETE FROM wardrobe_items WHERE user_id = $uid', { $uid: userId });

    for (const item of filteredManifest) {
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
    console.log('[demo/seed] ok user=%s section=%s count=%s manifest=%s', userId, requestedSection, filteredManifest.length, manifestPath);
    res.json({ ok: true, count: filteredManifest.length, section: requestedSection });
  } catch (err) {
    console.error('Demo seed error:', err);
    const msg = process.env.NODE_ENV === 'development' ? err.message : 'Failed to seed demo wardrobe.';
    res.status(500).json({ error: msg, code: 'DEMO_SEED_FAILED' });
  }
});

module.exports = router;
