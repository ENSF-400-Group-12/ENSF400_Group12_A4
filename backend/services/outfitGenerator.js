/**
 * Rule-based outfit generator with local candidate search + optional OpenAI rerank.
 * Uses wardrobe metadata (type, color, season, style) — no weather, no RAG.
 */

const { getDb } = require('../db/connection');
const { scoreOutfitCoherence } = require('../lib/styleRubric');
const { rerankOutfitCandidates } = require('./openaiOutfitRerank');

const SLOT_TYPES = {
  top: ['Shirt', 'T-Shirt', 'Hoodie', 'Sweater', 'Blazer', 'Dress'],
  bottom: ['Pants', 'Jeans', 'Shorts', 'Skirt'],
  shoes: ['Shoes', 'Boots', 'Sneakers', 'Sandals'],
  outerwear: ['Jacket', 'Coat'],
};

const REQUIRED_SLOTS = ['top', 'bottom', 'shoes'];
const INSUFFICIENT_MESSAGE =
  'Not enough items in your wardrobe to build an outfit. Add at least one top, one bottom, and one pair of shoes.';

const VIBE_STYLE_KEYWORDS = {
  casual: ['casual', 'smart casual', 'streetwear'],
  formal: ['formal', 'business', 'classy'],
  minimalist: ['minimalist', 'minimal'],
  sporty: ['sport', 'athletic', 'sporty'],
  classy: ['formal', 'classy', 'business', 'smart casual'],
  streetwear: ['streetwear', 'casual'],
  vintage: ['vintage'],
  emo: ['vintage'],
};

const VIBE_COLOR_HINTS = {
  emo: /black|gray|grey|navy|burgundy|dark/i,
  minimalist: /black|white|gray|grey|navy|beige|cream/i,
};

const TOP_K_SLOT = 3;
const MAX_CANDIDATES = 5;

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
  return `This ${occasion || 'outfit'} look leans ${vibe || 'casual'}: ${list}. Pieces were scored for vibe and color harmony.`;
}

function getTopKForSlot(items, occasion, vibe, k) {
  const scored = items.map((item) => ({ item, score: scoreItem(item, occasion, vibe) }));
  scored.sort((a, b) => b.score - a.score);
  const out = [];
  const seen = new Set();
  for (const { item } of scored) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= k) break;
  }
  return out;
}

function selectedKey(selected) {
  return ['top', 'bottom', 'shoes', 'outerwear']
    .map((s) => (selected[s] ? selected[s].id : 'x'))
    .join('-');
}

function buildLocalCandidates(bySlot, occasion, vibe) {
  const tops = getTopKForSlot(bySlot.top, occasion, vibe, TOP_K_SLOT);
  const bottoms = getTopKForSlot(bySlot.bottom, occasion, vibe, TOP_K_SLOT);
  const shoelist = getTopKForSlot(bySlot.shoes, occasion, vibe, TOP_K_SLOT);
  const outerTop = getTopKForSlot(bySlot.outerwear, occasion, vibe, 2);
  const outerChoices = bySlot.outerwear.length ? [null, ...outerTop] : [null];

  const raw = [];
  for (const top of tops) {
    const isDress = (top.type || '').toLowerCase().includes('dress');
    const bottomOpts = isDress ? [null] : bottoms;
    for (const bottom of bottomOpts) {
      for (const shoes of shoelist) {
        for (const outerwear of outerChoices) {
          const selected = { top, bottom, shoes, outerwear };
          let s = 0;
          if (selected.top) s += scoreItem(selected.top, occasion, vibe);
          if (selected.bottom) s += scoreItem(selected.bottom, occasion, vibe);
          if (selected.shoes) s += scoreItem(selected.shoes, occasion, vibe);
          if (selected.outerwear) s += scoreItem(selected.outerwear, occasion, vibe);
          s += scoreOutfitCoherence(selected, occasion, vibe);
          raw.push({ selected, localScore: s });
        }
      }
    }
  }

  raw.sort((a, b) => b.localScore - a.localScore);
  const seen = new Set();
  const unique = [];
  for (const c of raw) {
    const key = selectedKey(c.selected);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
    if (unique.length >= MAX_CANDIDATES) break;
  }
  return unique;
}

function pickBestForSlot(items, occasion, vibe) {
  if (!items.length) return null;
  const top = getTopKForSlot(items, occasion, vibe, 1);
  return top[0] || null;
}

/**
 * @returns {Promise<{ items, explanation, occasion, vibe, reranked?, candidateCount? } | { error: string }>}
 */
async function generateOutfit(userId, occasion, vibe) {
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

  const candidates = buildLocalCandidates(bySlot, occasion, vibe);
  if (!candidates.length) {
    return { error: INSUFFICIENT_MESSAGE };
  }

  let chosen = candidates[0];
  let reranked = false;
  let explanation = buildExplanation(chosen.selected, occasion, vibe);

  const rerank = await rerankOutfitCandidates(candidates, occasion, vibe);
  if (rerank && candidates[rerank.chosenIndex]) {
    chosen = candidates[rerank.chosenIndex];
    explanation = rerank.explanation;
    reranked = true;
  }

  const selected = { ...chosen.selected };
  const isDressAsTop = selected.top && (selected.top.type || '').toLowerCase().includes('dress');
  if (isDressAsTop) {
    selected.bottom = null;
  }

  const outfitItems = [selected.top, selected.bottom, selected.shoes, selected.outerwear].filter(Boolean);
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
    reranked,
    candidateCount: candidates.length,
  };
}

module.exports = {
  generateOutfit,
  slotForType,
  scoreItem,
  pickBestForSlot,
  SLOT_TYPES,
};
