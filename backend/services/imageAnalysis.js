/**
 * Item analysis: OpenAI vision (high confidence only), else strong filename hints, else uncertain.
 */

const path = require('path');
const { inferFromFilename } = require('../lib/filenameInference');
const { normalizeMetadata } = require('../lib/metadataOptions');
const {
  resolveGarmentProfile,
  normalizeGarmentProfileInput,
  stripUnspecified,
} = require('../lib/garmentProfile');
const { analyzeItemImageOpenAI } = require('./openaiItemAnalysis');

const FOOTWEAR_TYPES = new Set(['Shoes', 'Sneakers', 'Boots', 'Sandals']);
const FOOTWEAR_IN_NAME =
  /\b(sneaker|trainers?|runners?|jays|jordan|adidas|boots?|loafers?|oxfords?|sandal|slides?|yeezy|campus|footwear|shoes|shoe)\b/i;
const HOODIE_IN_NAME = /\b(hoodie|hoody|sweatshirt|pullover|zip[\s_-]?up)\b/i;

/** Model sometimes returns "high" with a lazy default combo — treat as unusable. */
function isSuspiciousLazyCombo(normalized) {
  const { type, color, season, style } = normalized;
  if (type === 'Shirt' && color === 'Blue' && season === 'All Season' && style === 'Casual') return true;
  if (type === 'T-Shirt' && color === 'Black' && season === 'All Season' && style === 'Casual') return true;
  return false;
}

/** If filename clearly says footwear/hoodie but vision guessed a dress shirt, discard the guess. */
function openAiConflictsWithFilename(aiType, filename) {
  if (!filename || !aiType) return false;
  const base = path.basename(filename, path.extname(filename));
  if (FOOTWEAR_IN_NAME.test(base) && !FOOTWEAR_TYPES.has(aiType)) return true;
  if (HOODIE_IN_NAME.test(base) && (aiType === 'Shirt' || aiType === 'T-Shirt')) return true;
  return false;
}

function garmentProfileForAnalyzeRow(meta, richOverlay) {
  const row = {
    type: meta.type,
    color: meta.color,
    style: meta.style,
    notes: meta.notes != null ? String(meta.notes) : '',
    garment_profile: null,
  };
  const base = resolveGarmentProfile(row);
  const overlay = normalizeGarmentProfileInput(richOverlay || {});
  return stripUnspecified({ ...base, ...overlay });
}

/**
 * @returns {Promise<object>}
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
          if (isSuspiciousLazyCombo(normalized) || openAiConflictsWithFilename(normalized.type, filename)) {
            console.warn('[analyzeItemImage] discarding OpenAI guess (lazy combo or conflicts with filename)');
          } else {
            const garmentProfile = garmentProfileForAnalyzeRow(
              { ...normalized, notes: '' },
              {
                category: rest.category,
                subtype: rest.subtype,
                formality: rest.formality,
                silhouette: rest.silhouette,
                materialVibe: rest.materialVibe,
                patternOrTexture: rest.patternOrTexture,
                layerRole: rest.layerRole,
                statementLevel: rest.statementLevel,
                colorFamily: rest.colorFamily,
                warmth: rest.warmth,
                versatility: rest.versatility,
              }
            );
            return { ...normalized, fromOpenAI: true, garmentProfile };
          }
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
    const garmentProfile = garmentProfileForAnalyzeRow(
      { ...inferred, notes: path.basename(filename || '', path.extname(filename || '')) },
      {}
    );
    return { ...inferred, fromFilename: true, garmentProfile };
  }
  return { uncertain: true };
}

module.exports = { analyzeItemImage };
