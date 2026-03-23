const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { getDb, persist } = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');
const { upload, memoryUpload } = require('../config/upload');
const { analyzeItemImage } = require('../services/imageAnalysis');
const { getUploadsDir } = require('../lib/storageConfig');
const { findDuplicateRows, sha256FileBuffer } = require('../lib/wardrobeDuplicate');
const { normalizeItemImageBuffer } = require('../lib/normalizeItemImage');
const {
  profileForApi,
  normalizeGarmentProfileInput,
  serializeProfileForDb,
} = require('../lib/garmentProfile');

const ITEM_SELECT =
  'SELECT id, user_id, type, color, season, style, notes, image_path, created_at, garment_profile, content_hash FROM wardrobe_items';

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

function getSelectResult(db, sql, params) {
  const result = db.exec(sql, params);
  if (!result.length || !result[0].values.length) return null;
  const row = result[0].values[0];
  const cols = result[0].columns;
  const obj = {};
  cols.forEach((c, i) => { obj[c] = row[i]; });
  return obj;
}

const MAX_LEN = { type: 80, color: 80, season: 80, style: 80, notes: 500, garmentProfileJson: 12000 };

function parseGarmentProfileFromBody(body) {
  if (!body || body.garmentProfile == null || body.garmentProfile === '') return null;
  try {
    const raw = typeof body.garmentProfile === 'string' ? JSON.parse(body.garmentProfile) : body.garmentProfile;
    if (!raw || typeof raw !== 'object') return null;
    return serializeProfileForDb(normalizeGarmentProfileInput(raw));
  } catch (_) {
    return null;
  }
}

function mapItemRow(row) {
  return {
    id: row.id,
    type: row.type,
    color: row.color,
    season: row.season,
    style: row.style,
    notes: row.notes ?? '',
    image_path: row.image_path,
    created_at: row.created_at,
    garmentProfile: profileForApi(row),
  };
}

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

function parseDuplicateOverride(v) {
  return v === '1' || v === 'true' || v === true;
}

function safeUnlink(absPath) {
  try {
    if (absPath && fs.existsSync(absPath)) fs.unlinkSync(absPath);
    return true;
  } catch (err) {
    console.warn('[items] failed to remove file:', err.message);
    return false;
  }
}

function duplicateConflictPayload(exact, similar) {
  const hasExact = exact.length > 0;
  const duplicateLevel = hasExact ? (similar.length > 0 ? 'both' : 'exact') : 'similar';
  const message = hasExact
    ? 'This image matches an item already in your wardrobe.'
    : 'You may already have a very similar item (same type, color, and style).';
  return {
    code: 'DUPLICATE_ITEM',
    duplicateLevel,
    message,
    exact: exact.map(mapItemRow),
    similar: similar.map(mapItemRow),
  };
}

function itemInputFromRequest(req) {
  const type = (req.body.type && req.body.type.trim()) || '';
  const color = (req.body.color && req.body.color.trim()) || '';
  const season = (req.body.season && req.body.season.trim()) || '';
  const style = (req.body.style && req.body.style.trim()) || '';
  const notes = req.body.notes != null ? String(req.body.notes).trim() : '';
  return { type, color, season, style, notes };
}

function duplicateCheckWithoutImage(db, userId, fields) {
  const { exact, similar } = findDuplicateRows(db, userId, null, fields.type, fields.color, fields.style);
  if (similar.length === 0) return null;
  return duplicateConflictPayload(exact, similar);
}

function duplicateCheckWithImage(db, userId, diskPath, fields) {
  const contentHash = sha256FileBuffer(diskPath);
  const { exact, similar } = findDuplicateRows(db, userId, contentHash, fields.type, fields.color, fields.style);
  if (exact.length === 0 && similar.length === 0) return { contentHash, conflict: null };
  return { contentHash, conflict: duplicateConflictPayload(exact, similar) };
}

/**
 * Transcode HEIC/HEIF on disk to JPEG so browsers and OpenAI can use the file.
 */
async function normalizeMulterDiskFile(file, uploadsDir) {
  if (!file?.path) return;
  let buf;
  try {
    buf = fs.readFileSync(file.path);
  } catch (readErr) {
    safeUnlink(file.path);
    throw new Error('Could not read the uploaded image. Try again.');
  }
  const { buffer, mimeType } = await normalizeItemImageBuffer(buf, file.mimetype, file.originalname);
  if (buffer === buf && mimeType === file.mimetype) {
    return;
  }
  safeUnlink(file.path);
  const stem = path.basename(file.filename, path.extname(file.filename));
  const newFilename = `${stem}.jpg`;
  const newPath = path.join(uploadsDir, newFilename);
  fs.writeFileSync(newPath, buffer);
  file.filename = newFilename;
  file.path = newPath;
  file.size = buffer.length;
  file.mimetype = mimeType;
}

function insertWardrobeItem(db, userId, fields, imagePath, garmentProfileJson, contentHash) {
  db.run(
    `INSERT INTO wardrobe_items (user_id, type, color, season, style, notes, image_path, garment_profile, content_hash)
     VALUES ($uid, $type, $color, $season, $style, $notes, $path, $gp, $hash)`,
    {
      $uid: userId,
      $type: fields.type,
      $color: fields.color,
      $season: fields.season,
      $style: fields.style,
      $notes: fields.notes,
      $path: imagePath,
      $gp: garmentProfileJson,
      $hash: contentHash,
    }
  );
}

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = rowsToObjects(
      db.exec(
        `${ITEM_SELECT} WHERE user_id = $uid ORDER BY created_at DESC`,
        { $uid: req.session.userId }
      )
    );
    const items = rows.map((r) => mapItemRow(r));
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load wardrobe items.' });
  }
});

router.post('/analyze', (req, res, next) => {
  memoryUpload.single('image')(req, res, (err) => {
    if (err) {
      if (err.message && err.message.includes('image')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Upload failed.' });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'No image provided.' });
  }
  try {
    const { buffer, mimeType } = await normalizeItemImageBuffer(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );
    const metadata = await analyzeItemImage(buffer, mimeType, req.file.originalname);
    let suggestionSource = 'none';
    if (metadata.fromOpenAI) suggestionSource = 'ai';
    else if (metadata.fromFilename) suggestionSource = 'filename';
    const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
    res.json({ ...metadata, suggestionSource, openaiConfigured });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Could not read this photo')) {
      return res.status(400).json({ error: msg });
    }
    console.warn('[items/analyze]', msg);
    res.status(500).json({ error: 'Analysis failed. You can still add the item manually.' });
  }
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid item id.' });
  }
  try {
    const db = getDb();
    const row = getSelectResult(
      db,
      `${ITEM_SELECT} WHERE id = $id`,
      { $id: id }
    );
    if (!row) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    if (row.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'You can only view your own items.' });
    }
    res.json({ item: mapItemRow(row) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load item.' });
  }
});

router.post('/', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.message && err.message.includes('image')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Upload failed.' });
    }
    next();
  });
}, async (req, res) => {
  const fields = itemInputFromRequest(req);
  const garmentProfileJson = parseGarmentProfileFromBody(req.body);
  if (garmentProfileJson && garmentProfileJson.length > MAX_LEN.garmentProfileJson) {
    return res.status(400).json({ error: 'Garment profile data is too large.' });
  }

  const validationError = validateItemFields(fields.type, fields.color, fields.season, fields.style, fields.notes);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const overrideDuplicate = parseDuplicateOverride(req.body.duplicateOverride);

  try {
    const db = getDb();
    const uploadsDir = getUploadsDir();
    let contentHash = null;

    if (req.file) {
      try {
        await normalizeMulterDiskFile(req.file, uploadsDir);
      } catch (normErr) {
        const msg = normErr instanceof Error ? normErr.message : 'Could not process image.';
        if (req.file.path) safeUnlink(req.file.path);
        return res.status(400).json({ error: msg });
      }
    }

    const image_path = req.file ? `/uploads/${req.file.filename}` : null;

    if (req.file) {
      const diskPath = path.join(uploadsDir, req.file.filename);
      try {
        const result = duplicateCheckWithImage(db, req.session.userId, diskPath, fields);
        contentHash = result.contentHash;
        if (!overrideDuplicate && result.conflict) {
          safeUnlink(diskPath);
          return res.status(409).json(result.conflict);
        }
      } catch (hashErr) {
        safeUnlink(diskPath);
        return res.status(500).json({ error: 'Could not read the uploaded image. Try again.' });
      }
    } else if (!overrideDuplicate) {
      const conflict = duplicateCheckWithoutImage(db, req.session.userId, fields);
      if (conflict) return res.status(409).json(conflict);
    }

    insertWardrobeItem(db, req.session.userId, fields, image_path, garmentProfileJson, contentHash);
    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const id = (idResult && idResult[0] && idResult[0].values && idResult[0].values[0]) ? idResult[0].values[0][0] : null;
    if (id == null) {
      return res.status(500).json({ error: 'Item was not created. Please try again.' });
    }
    persist();
    const created = getSelectResult(
      db,
      `${ITEM_SELECT} WHERE id = $id`,
      { $id: id }
    );
    res.status(201).json({ item: mapItemRow(created) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save item.' });
  }
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid item id.' });
  }

  const type = (req.body.type && req.body.type.trim()) || '';
  const color = (req.body.color && req.body.color.trim()) || '';
  const season = (req.body.season && req.body.season.trim()) || '';
  const style = (req.body.style && req.body.style.trim()) || '';
  const notes = req.body.notes != null ? String(req.body.notes).trim() : '';
  let garmentProfileJson = null;
  if (Object.prototype.hasOwnProperty.call(req.body, 'garmentProfile')) {
    garmentProfileJson = parseGarmentProfileFromBody(req.body);
    if (req.body.garmentProfile != null && req.body.garmentProfile !== '' && garmentProfileJson === null) {
      return res.status(400).json({ error: 'Invalid garment profile JSON.' });
    }
  }

  const validationError = validateItemFields(type, color, season, style, notes);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const db = getDb();
    const row = getSelectResult(db, 'SELECT id, user_id, image_path FROM wardrobe_items WHERE id = $id', { $id: id });
    if (!row) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    if (row.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'You can only edit your own items.' });
    }

    if (garmentProfileJson !== null) {
      if (garmentProfileJson.length > MAX_LEN.garmentProfileJson) {
        return res.status(400).json({ error: 'Garment profile data is too large.' });
      }
      db.run(
        `UPDATE wardrobe_items SET type = $type, color = $color, season = $season, style = $style, notes = $notes, garment_profile = $gp WHERE id = $id`,
        { $type: type, $color: color, $season: season, $style: style, $notes: notes, $gp: garmentProfileJson, $id: id }
      );
    } else {
      db.run(
        `UPDATE wardrobe_items SET type = $type, color = $color, season = $season, style = $style, notes = $notes WHERE id = $id`,
        { $type: type, $color: color, $season: season, $style: style, $notes: notes, $id: id }
      );
    }
    persist();

    const updated = getSelectResult(
      db,
      `${ITEM_SELECT} WHERE id = $id`,
      { $id: id }
    );
    res.json({ item: mapItemRow(updated) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item.' });
  }
});

router.post('/:id/image', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.message && err.message.includes('image')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Upload failed.' });
    }
    next();
  });
}, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid item id.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided.' });
  }

  try {
    const db = getDb();
    const row = getSelectResult(db, 'SELECT id, user_id, image_path FROM wardrobe_items WHERE id = $id', { $id: id });
    if (!row) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    if (row.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'You can only update your own items.' });
    }

    const uploadsDir = getUploadsDir();
    try {
      await normalizeMulterDiskFile(req.file, uploadsDir);
    } catch (normErr) {
      const msg = normErr instanceof Error ? normErr.message : 'Could not process image.';
      if (req.file.path) safeUnlink(req.file.path);
      return res.status(400).json({ error: msg });
    }

    if (row.image_path) {
      const oldPath = path.join(uploadsDir, path.basename(row.image_path));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const newPath = `/uploads/${req.file.filename}`;
    const diskNew = path.join(uploadsDir, req.file.filename);
    let newHash = null;
    try {
      newHash = sha256FileBuffer(diskNew);
    } catch (hashErr) {
      console.warn('[items] could not hash uploaded image:', hashErr.message);
      return res.status(500).json({ error: 'Could not read the uploaded image. Try again.' });
    }
    db.run(
      'UPDATE wardrobe_items SET image_path = $path, content_hash = $h WHERE id = $id',
      { $path: newPath, $h: newHash, $id: id }
    );
    persist();

    const updated = getSelectResult(
      db,
      `${ITEM_SELECT} WHERE id = $id`,
      { $id: id }
    );
    res.json({ item: mapItemRow(updated) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update image.' });
  }
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid item id.' });
  }

  try {
    const db = getDb();
    const row = getSelectResult(db, 'SELECT id, user_id, image_path FROM wardrobe_items WHERE id = $id', { $id: id });
    if (!row) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    if (row.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'You can only delete your own items.' });
    }

    const uploadsDir = getUploadsDir();
    if (row.image_path) {
      const filePath = path.join(uploadsDir, path.basename(row.image_path));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    db.run('DELETE FROM wardrobe_items WHERE id = $id', { $id: id });
    persist();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item.' });
  }
});

module.exports = router;
