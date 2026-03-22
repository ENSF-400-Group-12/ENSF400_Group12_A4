/**
 * Local style rubric for outfit scoring and optional LLM rerank context.
 * No weather, no RAG — compact rules only.
 */

const NEUTRAL = /^(black|white|gray|grey|navy|beige|cream|brown)$/i;
const BRIGHT = /^(yellow|orange|pink|red|light blue|purple|green)$/i;
const FORMALISH = /formal|business|blazer|smart casual/i;
const SPORTISH = /sport|athletic/i;

/** Short text passed to rerank prompt */
const RUBRIC_SUMMARY = [
  'Prefer color harmony: neutrals (black, white, gray, navy, beige, cream, brown) work together.',
  'Avoid mixing formal pieces with obviously athletic/sport styles unless occasion is casual or outdoor.',
  'For Formal or Work, favor Formal, Business, Smart Casual, Minimalist over Sport/Athletic.',
  'For Minimalist vibe, prefer a tight neutral palette (at most one accent color).',
  'Shoes should match the formality of top + bottom (e.g. sneakers for casual/street, dress shoes for formal).',
].join(' ');

function isNeutralColor(color) {
  return color && NEUTRAL.test(String(color).trim());
}

function isBrightColor(color) {
  return color && BRIGHT.test(String(color).trim());
}

/**
 * @param {object} selected - { top, bottom, shoes, outerwear } nullable items with type, color, style
 * @param {string} occasion
 * @param {string} vibe
 * @returns {number} bonus/penalty added to outfit score
 */
function scoreOutfitCoherence(selected, occasion, vibe) {
  let score = 0;
  const pieces = ['top', 'bottom', 'shoes', 'outerwear']
    .map((k) => selected[k])
    .filter(Boolean);
  if (pieces.length === 0) return 0;

  const colors = pieces.map((p) => p.color).filter(Boolean);
  const neutralCount = colors.filter(isNeutralColor).length;
  if (neutralCount >= 2) score += 8;
  if (neutralCount === colors.length && colors.length >= 2) score += 4;

  const brightCount = colors.filter(isBrightColor).length;
  const vibeLower = (vibe || '').toLowerCase();
  const occasionLower = (occasion || '').toLowerCase();

  if ((vibeLower === 'minimalist' || vibeLower === 'formal' || vibeLower === 'classy') && brightCount >= 2) {
    score -= 14;
  }

  if ((occasionLower === 'formal' || occasionLower === 'work' || occasionLower === 'date night') && brightCount >= 2) {
    score -= 6;
  }

  const styles = pieces.map((p) => (p.style || '').toLowerCase()).join(' ');
  if (SPORTISH.test(styles) && (occasionLower === 'formal' || occasionLower === 'work')) {
    score -= 18;
  }
  if (SPORTISH.test(styles) && FORMALISH.test(styles) && occasionLower !== 'casual' && occasionLower !== 'weekend' && occasionLower !== 'outdoor') {
    score -= 12;
  }

  if (vibeLower === 'sporty' || vibeLower === 'streetwear' || occasionLower === 'outdoor' || occasionLower === 'weekend') {
    if (SPORTISH.test(styles) || /streetwear|casual/.test(styles)) score += 6;
  }

  const colorStr = colors.join(' ').toLowerCase();
  if (/navy|blue/.test(colorStr) && /brown|beige|cream|tan/.test(colorStr)) {
    score += 5;
  }

  return score;
}

module.exports = {
  RUBRIC_SUMMARY,
  scoreOutfitCoherence,
  isNeutralColor,
  isBrightColor,
};
