/**
 * Normalize uploads for analysis and storage: iPhone HEIC/HEIF → JPEG for OpenAI and browsers.
 */

const path = require('node:path');
const sharp = require('sharp');

const HEIC_MIMES = new Set(['image/heic', 'image/heif']);

function looksLikeHeic(mimetype, originalname) {
  const ext = path.extname(originalname || '').toLowerCase();
  if (HEIC_MIMES.has(mimetype)) return true;
  if (ext === '.heic' || ext === '.heif') return true;
  return false;
}

/**
 * Whether this upload should be passed through sharp to produce a JPEG.
 * @param {string} mimetype
 * @param {string} [originalname]
 * @returns {boolean}
 */
function shouldTranscodeToJpeg(mimetype, originalname) {
  if (looksLikeHeic(mimetype, originalname)) return true;
  if (mimetype === 'application/octet-stream') {
    const ext = path.extname(originalname || '').toLowerCase();
    return ext === '.heic' || ext === '.heif';
  }
  return false;
}

const MAX_EDGE = 2048;

/**
 * Decode/transcode to JPEG when needed; optionally downscale very large images.
 * @param {Buffer} inputBuffer
 * @param {string} mimetype
 * @param {string} [originalname]
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
 */
async function normalizeItemImageBuffer(inputBuffer, mimetype, originalname) {
  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error('Empty image buffer');
  }

  if (!shouldTranscodeToJpeg(mimetype, originalname)) {
    return { buffer: inputBuffer, mimeType: mimetype || 'image/jpeg' };
  }

  try {
    const out = await sharp(inputBuffer, { failOn: 'none' })
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    return { buffer: out, mimeType: 'image/jpeg' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not read this photo (${msg}). If it is HEIC, try Settings → Camera → Formats → “Most Compatible”, or export as JPG.`
    );
  }
}

module.exports = {
  normalizeItemImageBuffer,
  shouldTranscodeToJpeg,
  looksLikeHeic,
};
