/**
 * Image analysis service for clothing metadata extraction.
 *
 * Uses filename-based inference when no real vision API is available.
 * Returns {} when inference is not possible, so the UI can show "Add details below"
 * instead of fake confident wrong answers.
 *
 * To plug in a real AI/vision API: replace the filename fallback in analyzeItemImage(),
 * then pass the raw response through normalizeMetadata() before returning.
 */

const { inferFromFilename } = require('../lib/filenameInference');

/**
 * Analyze an item image and return suggested metadata (canonical values only).
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {string} [mimeType] - e.g. 'image/jpeg'
 * @param {string} [filename] - Original filename for inference (e.g. black_jays.jpg)
 * @returns {Promise<{ type?: string, color?: string, season?: string, style?: string, fromFilename?: boolean }>}
 */
async function analyzeItemImage(imageBuffer, mimeType, filename) {
  if (!imageBuffer || imageBuffer.length === 0) {
    return {};
  }

  // Filename-based inference: use when filename suggests type/color
  if (filename) {
    const inferred = inferFromFilename(filename);
    if (inferred && Object.keys(inferred).length > 0) {
      return { ...inferred, fromFilename: true };
    }
  }

  // No inference possible: return empty so UI shows "Add details below"
  return {};
}

module.exports = { analyzeItemImage };
