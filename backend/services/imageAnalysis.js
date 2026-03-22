/**
 * Item analysis: OpenAI vision (high confidence only), else strong filename hints, else uncertain.
 */

const { inferFromFilename } = require('../lib/filenameInference');
const { normalizeMetadata } = require('../lib/metadataOptions');
const { analyzeItemImageOpenAI } = require('./openaiItemAnalysis');

/**
 * @returns {Promise<{ type?: string, color?: string, season?: string, style?: string, fromOpenAI?: boolean, fromFilename?: boolean, uncertain?: boolean }>}
 */
async function analyzeItemImage(imageBuffer, mimeType, filename) {
  if (!imageBuffer || imageBuffer.length === 0) {
    return filenameInferenceOnly(filename);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    try {
      const raw = await analyzeItemImageOpenAI(imageBuffer, mimeType);
      if (raw.confidence === 'high') {
        const { confidence: _c, ...rest } = raw;
        const normalized = normalizeMetadata(rest);
        const filled = ['type', 'color', 'season', 'style'].filter((k) => normalized[k]);
        if (filled.length >= 4) {
          return { ...normalized, fromOpenAI: true };
        }
      }
    } catch (err) {
      console.warn('[analyzeItemImage] OpenAI failed:', err.message);
    }
  }

  return filenameInferenceOnly(filename);
}

function filenameInferenceOnly(filename) {
  if (!filename) {
    return { uncertain: true };
  }
  const inferred = inferFromFilename(filename);
  if (inferred && Object.keys(inferred).length > 0) {
    return { ...inferred, fromFilename: true };
  }
  return { uncertain: true };
}

module.exports = { analyzeItemImage };
