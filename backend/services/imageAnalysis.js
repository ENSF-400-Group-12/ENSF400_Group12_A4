/**
 * Item image analysis: OpenAI vision (structured JSON) when configured,
 * else filename inference, else empty suggestions.
 */

const { inferFromFilename } = require('../lib/filenameInference');
const { normalizeMetadata } = require('../lib/metadataOptions');
const { analyzeItemImageOpenAI } = require('./openaiItemAnalysis');

/**
 * Analyze an item image and return suggested metadata (canonical values only).
 * @param {Buffer} imageBuffer
 * @param {string} [mimeType]
 * @param {string} [filename]
 * @returns {Promise<{ type?: string, color?: string, season?: string, style?: string, fromOpenAI?: boolean, fromFilename?: boolean }>}
 */
async function analyzeItemImage(imageBuffer, mimeType, filename) {
  if (!imageBuffer || imageBuffer.length === 0) {
    return filenameInferenceOnly(filename);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    try {
      const raw = await analyzeItemImageOpenAI(imageBuffer, mimeType);
      const normalized = normalizeMetadata(raw);
      const keys = Object.keys(normalized).filter((k) => normalized[k]);
      if (keys.length >= 4) {
        return { ...normalized, fromOpenAI: true };
      }
    } catch (err) {
      console.warn('[analyzeItemImage] OpenAI failed, using filename fallback if any:', err.message);
    }
  }

  return filenameInferenceOnly(filename);
}

function filenameInferenceOnly(filename) {
  if (!filename) return {};
  const inferred = inferFromFilename(filename);
  if (inferred && Object.keys(inferred).length > 0) {
    return { ...inferred, fromFilename: true };
  }
  return {};
}

module.exports = { analyzeItemImage };
