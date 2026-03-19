/**
 * Image analysis service for clothing metadata extraction.
 *
 * This module provides a single entry point for analyzing item images.
 * Raw results are normalized to canonical metadata options so the API
 * always returns values that match frontend dropdowns.
 *
 * To plug in a real AI/vision API: replace the stub in analyzeItemImage(),
 * then pass the raw response through normalizeMetadata() before returning.
 */

const { normalizeMetadata } = require('../lib/metadataOptions');

/**
 * Analyze an item image and return suggested metadata (canonical values only).
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {string} [mimeType] - e.g. 'image/jpeg'
 * @returns {Promise<{ type?: string, color?: string, season?: string, style?: string }>}
 */
async function analyzeItemImage(imageBuffer, mimeType) {
  if (!imageBuffer || imageBuffer.length === 0) {
    return {};
  }
  // Stub: return mocked suggestions. Replace with real API call when ready.
  const raw = await new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        type: 'Shirt',
        color: 'Blue',
        season: 'All Season',
        style: 'Casual',
      });
    }, 600);
  });
  const normalized = normalizeMetadata(raw);
  return Object.fromEntries(Object.entries(normalized).filter(([, v]) => v != null));
}

module.exports = { analyzeItemImage };
