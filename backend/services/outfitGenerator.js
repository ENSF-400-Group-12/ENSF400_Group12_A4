/**
 * Rule-based outfit generator. Uses wardrobe metadata (type, color, season, style)
 * to pick one item per slot (top, bottom, shoes, optional outerwear) and
 * produce a short explanation. No external APIs.
 */

const { getDb } = require('../db/connection');

// Item types grouped by outfit slot for selection
const SLOT_TYPES = {
  top: ['Shirt', 'T-Shirt', 'Hoodie', 'Sweater', 'Blazer', 'Dress'],
  bottom: ['Pants', 'Jeans', 'Shorts', 'Skirt'],
  shoes: ['Shoes', 'Boots', 'Sneakers', 'Sandals'],
  outerwear: ['Jacket', 'Coat'],
};

const REQUIRED_SLOTS = ['top', 'bottom', 'shoes'];
const INSUFFICIENT_MESSAGE =
  'Not enough items in your wardrobe to build an outfit. Add at least one top, one bottom, and one pair of shoes.';

/**
 * Frontend vibes → backend style keywords for scoring.
 * Item style is stored from STYLES (Casual, Formal, Sport, etc.); vibes like "Sporty" / "Classy" map here.
 */
const VIBE_STYLE_KEYWORDS = {
  casual: ['casual', 'smart casual', 'streetwear'],
  formal: ['formal', 'business', 'classy'],
  minimalist: ['minimalist', 'minimal'],
  sporty: ['sport', 'athletic', 'sporty'],
  classy: ['formal', 'classy', 'business', 'smart casual'],
  streetwear: ['streetwear', 'casual'],
  vintage: ['vintage'],
  emo: ['vintage'], // no canonical "emo" style; vintage/alt overlap; also use color hint below
};

/** Vibes that get a bonus when item color matches (e.g. dark for emo, neutral for minimalist). */
const VIBE_COLOR_HINTS = {
  emo: /black|gray|grey|navy|burgundy|dark/i,
  minimalist: /black|white|gray|grey|navy|beige|cream/i,
};

function rowsToObjects(execResult) {
  if (!execResult.length || !execResult[0].values.length) return [];
  const { columns, values } = execResult[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });
}

function slotForType(type) {
  const t = (type || '').trim();
  for (const [slot, types] of Object.entries(SLOT_TYPES)) {
    if (types.some((x) => t.toLowerCase().includes(x.toLowerCase()))) return slot;
  }
  return t ? 'top' : null;
}

/**
 * Score an item for a given occasion and vibe. Higher = better match.
 * Uses VIBE_STYLE_KEYWORDS so frontend vibes (Sporty, Classy, Emo, etc.) map to backend style values.
 */
function scoreItem(item, occasion, vibe) {
  let score = 50;
  const style = (item.style || '').toLowerCase();
  const vibeLower = (vibe || '').trim().toLowerCase();
  const occasionLower = (occasion || '').toLowerCase();
  const color = (item.color || '').toLowerCase();

  const styleKeywords = VIBE_STYLE_KEYWORDS[vibeLower];
  if (styleKeywords?.length && styleKeywords.some((kw) => style.includes(kw))) {
    score += 25;
  }
  const colorHint = VIBE_COLOR_HINTS[vibeLower];
  if (colorHint && color.match(colorHint)) {
    score += 12;
  }

  if (occasionLower === 'formal' && (style.includes('formal') || style.includes('classy') || style.includes('business'))) score += 20;
  if (occasionLower === 'casual' && (style.includes('casual') || style.includes('streetwear'))) score += 20;
  if (occasionLower === 'work' && (style.includes('formal') || style.includes('classy') || style.includes('minimalist') || style.includes('business'))) score += 15;
  if (occasionLower === 'date night' && (style.includes('formal') || style.includes('classy') || style.includes('smart casual'))) score += 15;
  if (occasionLower === 'outdoor' && (style.includes('sport') || style.includes('athletic') || style.includes('casual'))) score += 12;
  if (occasionLower === 'weekend' && (style.includes('casual') || style.includes('streetwear') || style.includes('sport'))) score += 15;
  if (occasionLower === 'school' && (style.includes('casual') || style.includes('minimalist') || style.includes('smart casual') || style.includes('sport'))) score += 15;

  return score;
}

function toApiItem(row) {
  return {
    id: row.id,
    type: row.type,
    color: row.color,
    season: row.season,
    style: row.style,
    notes: row.notes ?? '',
    image_path: row.image_path,
    created_at: row.created_at,
    slot: slotForType(row.type),
  };
}

function formatItemLabel(item) {
  return item.type + (item.color ? ` (${item.color})` : '');
}

function buildExplanation(selected, occasion, vibe) {
  const parts = ['top', 'bottom', 'shoes', 'outerwear']
    .map((slot) => selected[slot] && formatItemLabel(selected[slot]))
    .filter(Boolean);
  const list = parts.join(', ');
  return `This ${occasion || 'outfit'} fits a ${vibe || 'relaxed'} vibe: ${list}. The pieces work together for the occasion.`;
}

/** Pick the single best item from a slot array by score. */
function pickBestForSlot(items, occasion, vibe) {
  if (!items.length) return null;
  const scored = items.map((item) => ({ item, score: scoreItem(item, occasion, vibe) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].item;
}

/**
 * Generate one outfit for the user. Returns { items, explanation, occasion, vibe }
 * or { error } if the wardrobe has too few items to fill required slots.
 */
function generateOutfit(userId, occasion, vibe) {
  const db = getDb();
  const rows = rowsToObjects(
    db.exec(
      'SELECT id, user_id, type, color, season, style, notes, image_path, created_at FROM wardrobe_items WHERE user_id = $uid',
      { $uid: userId }
    )
  );
  const items = rows.map(toApiItem).filter((i) => i.slot);

  const bySlot = { top: [], bottom: [], shoes: [], outerwear: [] };
  items.forEach((item) => {
    if (bySlot[item.slot]) bySlot[item.slot].push(item);
  });

  const missingSlot = REQUIRED_SLOTS.find((slot) => bySlot[slot].length === 0);
  if (missingSlot) {
    return { error: INSUFFICIENT_MESSAGE };
  }

  const selected = {
    top: pickBestForSlot(bySlot.top, occasion, vibe),
    bottom: pickBestForSlot(bySlot.bottom, occasion, vibe),
    shoes: pickBestForSlot(bySlot.shoes, occasion, vibe),
    outerwear: bySlot.outerwear.length ? pickBestForSlot(bySlot.outerwear, occasion, vibe) : null,
  };

  const isDressAsTop = selected.top && (selected.top.type || '').toLowerCase().includes('dress');
  if (isDressAsTop) {
    selected.bottom = null;
  }

  const outfitItems = [selected.top, selected.bottom, selected.shoes, selected.outerwear].filter(Boolean);
  const explanation = buildExplanation(selected, occasion, vibe);

  return {
    items: outfitItems.map(({ id, type, color, season, style, notes, image_path, created_at }) => ({
      id,
      type,
      color,
      season,
      style,
      notes,
      image_path,
      created_at,
    })),
    explanation,
    occasion: occasion || 'Casual',
    vibe: vibe || 'Casual',
  };
}

module.exports = { generateOutfit, slotForType, scoreItem, pickBestForSlot, SLOT_TYPES };
