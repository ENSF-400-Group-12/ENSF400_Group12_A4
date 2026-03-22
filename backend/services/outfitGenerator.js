/**
 * Rule-based outfit generator: core = top + bottom + shoes; outerwear only when it clearly helps.
 * Rejects weak fits for demanding occasion/vibe combinations.
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

const NOT_SUITABLE_MESSAGE =
  "Your wardrobe doesn't have enough pieces that fit this occasion and vibe. Try a different combination, or add items that match the look you want.";

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

const TOP_K_SLOT = 4;
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
  const list = parts.join(' · ');
  const occ = (occasion || '').trim() || 'this look';
  const vb = (vibe || '').trim() || 'versatile';
  return `${list}. Picked for ${occ} with a ${vb.toLowerCase()} feel — cohesive color and style.`;
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
  return ['top', 'bottom', 'shoes']
    .map((s) => (selected[s] ? selected[s].id : 'x'))
    .join('-');
}

/** Core outfits only (no outerwear in search grid). */
function buildLocalCandidates(bySlot, occasion, vibe) {
  const tops = getTopKForSlot(bySlot.top, occasion, vibe, TOP_K_SLOT);
  const bottoms = getTopKForSlot(bySlot.bottom, occasion, vibe, TOP_K_SLOT);
  const shoelist = getTopKForSlot(bySlot.shoes, occasion, vibe, TOP_K_SLOT);

  const raw = [];
  for (const top of tops) {
    const isDress = (top.type || '').toLowerCase().includes('dress');
    const bottomOpts = isDress ? [null] : bottoms;
    for (const bottom of bottomOpts) {
      for (const shoes of shoelist) {
        const selected = { top, bottom, shoes, outerwear: null };
        let s = 0;
        if (selected.top) s += scoreItem(selected.top, occasion, vibe);
        if (selected.bottom) s += scoreItem(selected.bottom, occasion, vibe);
        if (selected.shoes) s += scoreItem(selected.shoes, occasion, vibe);
        s += scoreOutfitCoherence(selected, occasion, vibe);
        raw.push({ selected, localScore: s });
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

/** Hard-to-dress combinations — require a stronger-scoring wardrobe match or reject. */
function occasionVibeClash(occasion, vibe) {
  const o = (occasion || '').trim().toLowerCase();
  const v = (vibe || '').trim().toLowerCase();
  if (!v) return false;
  if (o === 'formal' && ['casual', 'streetwear', 'sporty', 'emo'].includes(v)) return true;
  if (o === 'work' && ['streetwear', 'emo', 'sporty'].includes(v)) return true;
  if ((o === 'casual' || o === 'weekend') && v === 'formal') return true;
  if (o === 'outdoor' && (v === 'formal' || v === 'classy')) return true;
  return false;
}

function minAcceptableScore(occasion, vibe) {
  let m = 136;
  const o = (occasion || '').toLowerCase();
  const v = (vibe || '').trim().toLowerCase();
  if (o === 'formal' || v === 'formal' || v === 'classy') m += 34;
  if (o === 'date night' && (v === 'classy' || v === 'formal')) m += 20;
  if (o === 'work' && (v === 'formal' || v === 'minimalist' || v === 'classy')) m += 24;
  if (v === 'minimalist' || v === 'formal') m += 10;
  if (occasionVibeClash(occasion, vibe)) m += 32;
  return m;
}

function pickWithVariety(candidates, userId, occasion, vibe) {
  if (!candidates.length) return null;
  const topScore = candidates[0].localScore;
  const band = candidates.filter((c) => c.localScore >= topScore - 14);
  if (band.length <= 1) return band[0];
  let h = Number(userId) || 0;
  const seed = `${occasion}|${vibe}`;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return band[h % band.length];
}

function maybeAddOuterwear(selected, bySlot, occasion, vibe, coreScore) {
  if (!bySlot.outerwear?.length) return selected;
  const occ = (occasion || '').toLowerCase();
  const vib = (vibe || '').toLowerCase();
  const wantLayer =
    occ === 'outdoor' ||
    occ === 'formal' ||
    occ === 'work' ||
    occ === 'date night' ||
    /classy|formal|minimalist/.test(vib);

  let bestOw = null;
  let bestTotal = coreScore;
  for (const ow of bySlot.outerwear) {
    const sel = { ...selected, outerwear: ow };
    let s = 0;
    if (sel.top) s += scoreItem(sel.top, occasion, vibe);
    if (sel.bottom) s += scoreItem(sel.bottom, occasion, vibe);
    if (sel.shoes) s += scoreItem(sel.shoes, occasion, vibe);
    s += scoreItem(ow, occasion, vibe);
    s += scoreOutfitCoherence(sel, occasion, vibe);
    if (s > bestTotal) {
      bestTotal = s;
      bestOw = ow;
    }
  }
  const gain = bestTotal - coreScore;
  const threshold = wantLayer ? 12 : 22;
  if (bestOw && gain >= threshold) {
    return { ...selected, outerwear: bestOw };
  }
  return selected;
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

  const minScore = minAcceptableScore(occasion, vibe);
  if (candidates[0].localScore < minScore) {
    return { error: NOT_SUITABLE_MESSAGE };
  }

  let chosen = pickWithVariety(candidates, userId, occasion, vibe);
  if (!chosen || chosen.localScore < minScore) {
    return { error: NOT_SUITABLE_MESSAGE };
  }

  let reranked = false;
  let explanation = buildExplanation(chosen.selected, occasion, vibe);

  const rerank = await rerankOutfitCandidates(candidates, occasion, vibe);
  if (rerank && candidates[rerank.chosenIndex]) {
    const alt = candidates[rerank.chosenIndex];
    if (alt.localScore >= minScore) {
      chosen = alt;
      explanation = rerank.explanation;
      reranked = true;
    }
  }

  let selected = { ...chosen.selected };
  const isDressAsTop = selected.top && (selected.top.type || '').toLowerCase().includes('dress');
  if (isDressAsTop) {
    selected.bottom = null;
  }

  selected = maybeAddOuterwear(selected, bySlot, occasion, vibe, chosen.localScore);

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
