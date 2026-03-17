/**
 * Rule-based outfit generator. Uses wardrobe metadata (type, color, season, style)
 * to pick one item per slot (top, bottom, shoes, optional outerwear) and
 * produce a short explanation. No external APIs.
 */

const { getDb } = require('../db/connection');

const TOP_TYPES = ['Shirt', 'T-Shirt', 'Hoodie', 'Sweater', 'Blazer', 'Dress'];
const BOTTOM_TYPES = ['Pants', 'Jeans', 'Shorts', 'Skirt'];
const SHOES_TYPES = ['Shoes', 'Boots', 'Sneakers', 'Sandals'];
const OUTERWEAR_TYPES = ['Jacket', 'Coat'];

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
  if (TOP_TYPES.some((x) => t.toLowerCase().includes(x.toLowerCase()))) return 'top';
  if (BOTTOM_TYPES.some((x) => t.toLowerCase().includes(x.toLowerCase()))) return 'bottom';
  if (SHOES_TYPES.some((x) => t.toLowerCase().includes(x.toLowerCase()))) return 'shoes';
  if (OUTERWEAR_TYPES.some((x) => t.toLowerCase().includes(x.toLowerCase()))) return 'outerwear';
  if (t) return 'top';
  return null;
}

function scoreItem(item, occasion, vibe) {
  let score = 50;
  const style = (item.style || '').toLowerCase();
  const vibeLower = (vibe || '').toLowerCase();
  const occasionLower = (occasion || '').toLowerCase();
  if (vibeLower && style.includes(vibeLower)) score += 25;
  if (occasionLower === 'formal' && (style.includes('formal') || style.includes('classy'))) score += 20;
  if (occasionLower === 'casual' && (style.includes('casual') || style.includes('streetwear'))) score += 20;
  if (occasionLower === 'work' && (style.includes('formal') || style.includes('classy') || style.includes('minimalist'))) score += 15;
  if (vibeLower === 'minimalist' && (style.includes('minimal') || item.color?.toLowerCase().match(/black|white|gray|grey|navy|beige/))) score += 10;
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

function buildExplanation(selected, occasion, vibe) {
  const parts = [];
  if (selected.top) parts.push(selected.top.type + (selected.top.color ? ` (${selected.top.color})` : ''));
  if (selected.bottom) parts.push(selected.bottom.type + (selected.bottom.color ? ` (${selected.bottom.color})` : ''));
  if (selected.shoes) parts.push(selected.shoes.type + (selected.shoes.color ? ` (${selected.shoes.color})` : ''));
  if (selected.outerwear) parts.push(selected.outerwear.type);
  const list = parts.filter(Boolean).join(', ');
  return `This ${occasion || 'outfit'} fits a ${vibe || 'relaxed'} vibe: ${list}. The pieces work together for the occasion.`;
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

  if (bySlot.top.length === 0 || bySlot.bottom.length === 0 || bySlot.shoes.length === 0) {
    return {
      error: 'Not enough items in your wardrobe to build an outfit. Add at least one top, one bottom, and one pair of shoes.',
    };
  }

  const pickBest = (arr) => {
    if (!arr.length) return null;
    const scored = arr.map((item) => ({ item, score: scoreItem(item, occasion, vibe) }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].item;
  };

  const selected = {
    top: pickBest(bySlot.top),
    bottom: pickBest(bySlot.bottom),
    shoes: pickBest(bySlot.shoes),
    outerwear: bySlot.outerwear.length ? pickBest(bySlot.outerwear) : null,
  };

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

module.exports = { generateOutfit, slotForType, scoreItem };
