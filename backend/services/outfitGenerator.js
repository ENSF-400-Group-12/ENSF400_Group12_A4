/**
 * Outfit generator: grammar-aware candidates (separates or one-piece + shoes, optional mid layer, optional outerwear).
 * Uses garment profiles when present; derives from legacy fields otherwise.
 */

const { getDb } = require('../db/connection');
const { resolveGarmentProfile, formalityRank } = require('../lib/garmentProfile');
const { scoreOutfitCoherence } = require('../lib/styleRubric');
const { rerankOutfitCandidates } = require('./openaiOutfitRerank');

const SLOT_TYPES = {
  top: ['Shirt', 'Blouse', 'T-Shirt', 'Tank', 'Camisole', 'Bodysuit', 'Hoodie', 'Sweater'],
  mid: ['Blazer', 'Cardigan'],
  one_piece: ['Dress', 'Jumpsuit', 'Romper'],
  bottom: ['Pants', 'Jeans', 'Leggings', 'Shorts', 'Skirt'],
  shoes: ['Shoes', 'Heels', 'Flats', 'Boots', 'Dress Boots', 'Sneakers', 'Sandals'],
  outerwear: ['Jacket', 'Coat'],
};

const INSUFFICIENT_MESSAGE =
  'Not enough items in your wardrobe to build an outfit. Add either a one-piece garment or a top and bottom, plus one pair of shoes.';

const NOT_SUITABLE_MESSAGE =
  "Your wardrobe doesn't have enough pieces that fit this occasion and aesthetic. Try a different combination, or add items that match the look you want.";

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

const TOP_K_SLOT = 6;
const MAX_CANDIDATES = 10;
const PICK_QUALITY_BAND = 26;
const TOP_REPEAT_SOFT_PENALTY = 2.5;

function rowsToObjects(execResult) {
  if (!execResult.length || !execResult[0].values.length) return [];
  const { columns, values } = execResult[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });
}

function slotForType(type, profile = null) {
  const category = profile?.category || '';
  if (category === 'mid_layer') return 'mid';
  if (category === 'one_piece') return 'one_piece';
  if (category === 'top' || category === 'bottom' || category === 'shoes' || category === 'outerwear') {
    return category;
  }
  const t = (type || '').trim();
  for (const [slot, types] of Object.entries(SLOT_TYPES)) {
    if (types.some((x) => t.toLowerCase() === x.toLowerCase())) return slot;
  }
  return null;
}

function rowToItem(row) {
  const profile = resolveGarmentProfile(row);
  const slot = slotForType(row.type, profile);
  return {
    id: row.id,
    type: row.type,
    color: row.color,
    season: row.season,
    style: row.style,
    notes: row.notes ?? '',
    image_path: row.image_path,
    created_at: row.created_at,
    slot,
    profile,
  };
}

function polishedContext(occasion, vibe) {
  const occ = (occasion || '').toLowerCase();
  const vib = (vibe || '').trim().toLowerCase();
  return (
    occ === 'formal'
    || occ === 'date night'
    || occ === 'work'
    || vib === 'formal'
    || vib === 'classy'
    || vib === 'minimalist'
  );
}

function casualishContext(occasion, vibe) {
  const occ = (occasion || '').toLowerCase();
  const vib = (vibe || '').trim().toLowerCase();
  return (
    occ === 'casual'
    || occ === 'weekend'
    || occ === 'outdoor'
    || occ === 'school'
    || vib === 'streetwear'
    || vib === 'sporty'
    || vib === 'vintage'
    || vib === 'emo'
  );
}

/** Small targeted bonuses so occasion+vibe pairs do not collapse onto one “safe default” look */
function occasionVibeSpecificityNudge(item, occasion, vibe) {
  let n = 0;
  const o = (occasion || '').trim().toLowerCase();
  const v = (vibe || '').trim().toLowerCase();
  const st = (item.style || '').toLowerCase();
  const sub = item.profile?.subtype || '';
  const type = (item.type || '').toLowerCase();
  const slot = item.slot;

  if (o === 'work' && v === 'casual') {
    if (['chinos', 'dress_pants'].includes(sub)) n += 8;
    if (slot === 'top' && (st.includes('business') || st.includes('smart') || st.includes('minimalist'))) n += 7;
    if (slot === 'shoes' && (['loafers', 'dress_shoes', 'chelsea_boots'].includes(sub) || type === 'shoes')) n += 6;
    if (st.includes('sport') && (slot === 'shoes' || slot === 'top')) n -= 5;
  }

  if (o === 'date night' && v === 'formal') {
    if (['dress_shoes', 'loafers', 'chelsea_boots'].includes(sub)) n += 9;
    if (slot === 'top' && (st.includes('formal') || st.includes('classy'))) n += 6;
    if (slot === 'bottom' && ['dress_pants', 'chinos'].includes(sub)) n += 6;
  }

  if (o === 'date night' && v === 'classy') {
    if (st.includes('classy') || st.includes('formal') || st.includes('business')) n += 7;
    if (['dress_pants', 'chinos'].includes(sub)) n += 6;
    if (slot === 'shoes' && type !== 'sneakers') n += 4;
  }

  if (o === 'school' && v === 'streetwear') {
    if (st.includes('streetwear') || st.includes('casual')) n += 9;
    if (slot === 'shoes' && (type === 'sneakers' || sub === 'sneakers')) n += 7;
    if (slot === 'top' && (type === 'hoodie' || type === 't-shirt')) n += 4;
  }

  if (o === 'weekend' && v === 'sporty') {
    if (st.includes('sport') || sub === 'sneakers') n += 8;
    if (slot === 'bottom' && (sub === 'joggers' || st.includes('sport'))) n += 6;
    if (slot === 'shoes' && type === 'sneakers') n += 5;
  }

  if (o === 'outdoor' && v === 'casual') {
    if (st.includes('casual') || st.includes('sport')) n += 6;
    if (slot === 'shoes' && (type === 'boots' || type === 'dress boots' || sub === 'hiking_boots' || sub === 'dress_boots' || sub === 'sneakers')) n += 7;
    if (slot === 'outerwear' || type === 'jacket' || type === 'coat') n += 5;
  }

  if (o === 'outdoor' && v === 'vintage') {
    if (st.includes('vintage')) n += 11;
    if (slot === 'outerwear' && (st.includes('vintage') || st.includes('casual'))) n += 6;
  }

  if (o === 'work' && v === 'formal') {
    if (slot === 'mid' && (sub === 'blazer' || type === 'blazer')) n += 5;
    if (['dress_pants', 'chinos'].includes(sub)) n += 5;
  }

  return n;
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

/** Nudge scores toward weather-appropriate pieces (outerwear, layers, open footwear). Labels: Clear, Cloudy, Rain, Snow, Hot, Cold. */
function weatherItemBonus(item, weather) {
  const w = String(weather || '').trim();
  if (!w) return 0;
  const type = (item.type || '').toLowerCase();
  const slot = item.slot;
  let b = 0;

  const coldLike = w === 'Snow' || w === 'Cold';
  const hotLike = w === 'Hot';
  const wetLike = w === 'Rain';
  const layerBoost = coldLike || wetLike;

  if (coldLike || wetLike) {
    if (slot === 'outerwear' || type === 'jacket' || type === 'coat') b += 24;
    if (type === 'sweater' || type === 'hoodie') b += 12;
    if (type === 'boots' || type === 'dress boots') b += 10;
    if (type === 'sneakers') b += 4;
    if (type === 'sandals') b -= 22;
    if (type === 'shorts') b -= 18;
  }
  if (hotLike) {
    if (type === 'shorts') b += 14;
    if (type === 'sandals') b += 12;
    if (type === 't-shirt') b += 8;
    if (slot === 'outerwear' || type === 'coat') b -= 22;
    if (type === 'jacket') b -= 8;
  }
  if (layerBoost && (slot === 'outerwear' || type === 'jacket' || type === 'coat')) b += 6;
  return b;
}

function scoreItemRich(item, occasion, vibe, weather = '') {
  let s = scoreItem(item, occasion, vibe);
  const p = item.profile || {};
  const sub = p.subtype || '';
  const occ = (occasion || '').toLowerCase();
  const vib = (vibe || '').trim().toLowerCase();
  const pol = polishedContext(occasion, vibe);
  const casual = casualishContext(occasion, vibe);

  if (item.slot === 'shoes' && pol) {
    if (['sneakers', 'running_shoes', 'sandals', 'hiking_boots'].includes(sub) || (item.type === 'Sneakers' && p.formality === 'low')) {
      s -= 38;
    }
    if (['dress_shoes', 'loafers', 'chelsea_boots', 'dress_boots', 'heels', 'flats'].includes(sub)) s += 18;
  }

  if (item.slot === 'bottom' && pol) {
    if (sub === 'joggers' || /jogger|track/i.test(item.notes || '')) s -= 42;
    if (sub === 'leggings') s -= 34;
    if (sub === 'jeans' && p.materialVibe === 'denim' && vib === 'formal') s -= 25;
    if (['dress_pants', 'chinos'].includes(sub)) s += 14;
  }

  if (item.slot === 'one_piece') {
    if (sub === 'dress' || sub === 'jumpsuit') s += 14;
    if (sub === 'romper' && pol) s -= 18;
    if (pol && p.formality && formalityRank(p.formality) >= 4) s += 10;
  }

  if (item.slot === 'top' && pol && (sub === 'tee' || item.type === 'T-Shirt')) {
    s -= 8;
  }

  if (casual && item.slot === 'shoes' && (sub === 'sneakers' || item.type === 'Sneakers')) {
    s += 10;
  }

  if (pol && item.slot === 'mid' && (sub === 'blazer' || item.type === 'Blazer')) {
    s += 22;
  }
  if (item.slot === 'mid' && (sub === 'cardigan' || item.type === 'Cardigan')) {
    if (pol && (occ === 'formal' || vib === 'formal')) s -= 6;
    else s += 8;
  }

  /* Formal blazer as mid-layer is usually wrong for relaxed / street contexts: avoid dominating candidates */
  if (item.slot === 'mid' && (sub === 'blazer' || item.type === 'Blazer') && casual && !pol) {
    const v = vib;
    if (v === 'streetwear' || v === 'sporty') {
      s -= 72;
    } else if (occ === 'weekend' || occ === 'casual' || occ === 'outdoor' || occ === 'school') {
      s -= 48;
    } else {
      s -= 28;
    }
  }

  if (p.formality && pol) {
    const fr = formalityRank(p.formality);
    if (fr >= 4) s += 8;
    if (fr <= 2) s -= 12;
  }

  return s + occasionVibeSpecificityNudge(item, occasion, vibe) + weatherItemBonus(item, weather);
}

function formatItemLabel(item) {
  return item.type + (item.color ? ` (${item.color})` : '');
}

function formatOutfitFingerprint(selected) {
  return ['one_piece', 'top', 'mid', 'bottom', 'shoes']
    .map((slot) => {
      const it = selected[slot];
      if (!it) return null;
      return `${it.type}${it.color ? ` (${it.color})` : ''}`;
    })
    .filter(Boolean)
    .join(' · ');
}

/**
 * @param {{ altShort?: string, gap?: number } | null} compare - close runner-up for transparency (no fluff)
 */
function buildExplanation(selected, occasion, vibe, outerwearAdded, compare, weather = '') {
  const parts = ['one_piece', 'top', 'mid', 'bottom', 'shoes', 'outerwear']
    .map((slot) => selected[slot] && formatItemLabel(selected[slot]))
    .filter(Boolean);
  const list = parts.join(' · ');
  const occ = (occasion || '').trim() || 'this look';
  const vb = (vibe || '').trim() || 'versatile';
  let msg = `${list}. Picked for ${occ} with a ${vb.toLowerCase()} read: cohesion and formality line up without over-styling.`;
  const baseForLayer = selected.one_piece || selected.top;
  if (selected.mid && isMidBlazer(selected.mid) && baseForLayer) {
    const base = formatItemLabel(baseForLayer);
    msg += ` The blazer is layered over ${base.replace(/\s*\([^)]*\)\s*$/, '')} as the visible base, not worn as a stand-alone shirt.`;
  }
  if (outerwearAdded && selected.outerwear) {
    msg += ` Added ${formatItemLabel(selected.outerwear)} only because it sharpens the outfit.`;
  }
  if (compare?.altShort != null && compare.gap != null && compare.gap <= 6) {
    msg += ` Narrowly beat a similar mix (${compare.altShort}) for this occasion + aesthetic.`;
  }
  if (weather && String(weather).trim()) {
    msg += ` Weather: ${weather}.`;
  }
  return msg;
}

function getTopKForSlot(items, occasion, vibe, k, weather = '') {
  const scored = items.map((item) => ({ item, score: scoreItemRich(item, occasion, vibe, weather) }));
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
  return ['one_piece', 'top', 'mid', 'bottom', 'shoes']
    .map((s) => (selected[s] ? selected[s].id : 'x'))
    .join('-');
}

/** Groups near-duplicate wardrobe rows (same slot, type, color, style, subtype) so duplicates do not inflate diversity. */
function wardrobeStyleSignature(item) {
  if (!item) return 'x';
  const slot = item.slot || 'u';
  const t = String(item.type || '').trim().toLowerCase();
  const c = String(item.color || '').trim().toLowerCase();
  const st = String(item.style || '').trim().toLowerCase();
  const sub = String(item.profile?.subtype || '').trim().toLowerCase();
  return `${slot}|${t}|${c}|${st}|${sub}`;
}

function baseSignature(selected) {
  if (selected.one_piece) return wardrobeStyleSignature(selected.one_piece);
  return `${wardrobeStyleSignature(selected.top)}__${wardrobeStyleSignature(selected.bottom)}`;
}

function baseShoeSignatureKey(selected) {
  return `${baseSignature(selected)}__${wardrobeStyleSignature(selected.shoes)}`;
}

/**
 * Prefer structurally different strong outfits (vary top×shoes, then top, then shoes) before near-duplicate fills.
 */
function selectDiverseCandidates(sortedRaw, max) {
  const result = [];
  const usedOutfitKey = new Set();
  const usedBaseShoe = new Set();
  const usedBase = new Set();
  const usedShoe = new Set();

  function take(passFn) {
    for (const c of sortedRaw) {
      if (result.length >= max) break;
      const k = selectedKey(c.selected);
      if (usedOutfitKey.has(k)) continue;
      if (!passFn(c)) continue;
      usedOutfitKey.add(k);
      usedBaseShoe.add(baseShoeSignatureKey(c.selected));
      usedBase.add(baseSignature(c.selected));
      if (c.selected.shoes) usedShoe.add(wardrobeStyleSignature(c.selected.shoes));
      result.push(c);
    }
  }

  take((c) => !usedBaseShoe.has(baseShoeSignatureKey(c.selected)));
  take((c) => {
    const sig = baseSignature(c.selected);
    return sig && !usedBase.has(sig);
  });
  take((c) => {
    const sig = wardrobeStyleSignature(c.selected.shoes);
    return c.selected.shoes && !usedShoe.has(sig);
  });
  take(() => true);

  return result;
}

function shoeAllowedForLook(shoe, occasion, vibe) {
  if (!polishedContext(occasion, vibe)) return true;
  const p = shoe.profile || {};
  const sub = p.subtype || '';
  if (['sneakers', 'running_shoes', 'sandals', 'hiking_boots'].includes(sub)) return false;
  if (shoe.type === 'Sneakers' && p.versatility === 'sporty') return false;
  if (shoe.type === 'Sandals') return false;
  return true;
}

function bottomAllowedForLook(bottom, occasion, vibe) {
  if (!polishedContext(occasion, vibe)) return true;
  const p = bottom.profile || {};
  const sub = p.subtype || '';
  if (sub === 'joggers') return false;
  if (sub === 'leggings') return false;
  if (sub === 'jeans' && (vibe || '').toLowerCase() === 'formal') return false;
  return true;
}

function onePieceAllowedForLook(onePiece, occasion, vibe) {
  if (!onePiece) return false;
  if (!polishedContext(occasion, vibe)) return true;
  const sub = onePiece.profile?.subtype || '';
  if (sub === 'romper') return false;
  return true;
}

/** Hoodie-like base (type or analyzed subtype): not worn under a blazer in polished looks */
function topActsAsHoodie(top) {
  if (!top) return false;
  if (top.type === 'Hoodie') return true;
  const sub = top.profile?.subtype;
  return sub === 'hoodie';
}

function isMidBlazer(item) {
  if (!item) return false;
  if (item.type === 'Blazer') return true;
  return item.profile?.subtype === 'blazer';
}

function isMidCardigan(item) {
  if (!item) return false;
  if (item.type === 'Cardigan') return true;
  return item.profile?.subtype === 'cardigan';
}

/** Full formal: blazer only over a proper shirt or sweater (no tee, no hoodie). */
function strictBlazerUnderlayerRequired(occasion, vibe) {
  const o = (occasion || '').trim().toLowerCase();
  const v = (vibe || '').trim().toLowerCase();
  return o === 'formal' && v === 'formal';
}

/**
 * When a blazer is the mid layer, the true "shirt" is the base top. Never treat the blazer as the only top in polished contexts.
 * @param {boolean} pol - polishedContext
 */
function blazerBaseTopAllowed(base, occasion, vibe, pol, isOnePiece) {
  if (!base) return false;
  if (isOnePiece) {
    return ['Dress', 'Jumpsuit'].includes(base.type);
  }

  if (pol) {
    if (topActsAsHoodie(base)) return false;
    if (strictBlazerUnderlayerRequired(occasion, vibe)) {
      return ['Shirt', 'Blouse', 'Sweater'].includes(base.type);
    }
    return ['Shirt', 'Blouse', 'T-Shirt', 'Tank', 'Camisole', 'Bodysuit', 'Sweater'].includes(base.type);
  }

  const okCasual = ['Shirt', 'Blouse', 'T-Shirt', 'Tank', 'Camisole', 'Bodysuit', 'Hoodie', 'Sweater'].includes(base.type);
  return okCasual;
}

function passesGrammar(selected, occasion, vibe) {
  const pol = polishedContext(occasion, vibe);
  if (!selected.shoes || !shoeAllowedForLook(selected.shoes, occasion, vibe)) return false;
  if (selected.one_piece) {
    if (!onePieceAllowedForLook(selected.one_piece, occasion, vibe)) return false;
  } else {
    if (!selected.top || !selected.bottom) return false;
    if (!bottomAllowedForLook(selected.bottom, occasion, vibe)) return false;
  }
  if (selected.mid && isMidBlazer(selected.mid)) {
    const base = selected.one_piece || selected.top;
    if (!base) return false;
    if (!blazerBaseTopAllowed(base, occasion, vibe, pol, Boolean(selected.one_piece))) return false;
  }
  if (selected.mid && isMidCardigan(selected.mid) && selected.one_piece) {
    const subtype = selected.one_piece.profile?.subtype || '';
    if (subtype === 'romper' && pol) return false;
  }
  return true;
}

function buildLocalCandidates(bySlot, occasion, vibe, weather = '') {
  const tops = getTopKForSlot(bySlot.top, occasion, vibe, TOP_K_SLOT, weather);
  const onePieces = getTopKForSlot(bySlot.one_piece, occasion, vibe, TOP_K_SLOT, weather);
  const bottoms = getTopKForSlot(bySlot.bottom, occasion, vibe, TOP_K_SLOT, weather);
  const shoelist = getTopKForSlot(bySlot.shoes, occasion, vibe, TOP_K_SLOT, weather).filter((s) => shoeAllowedForLook(s, occasion, vibe));
  const midOptions = bySlot.mid?.length ? [null, ...getTopKForSlot(bySlot.mid, occasion, vibe, TOP_K_SLOT, weather)] : [null];

  const raw = [];
  for (const onePiece of onePieces) {
    for (const shoes of shoelist) {
      for (const mid of midOptions) {
        const selected = { one_piece: onePiece, top: null, bottom: null, shoes, mid, outerwear: null };
        if (!passesGrammar(selected, occasion, vibe)) continue;
        let s = 0;
        s += scoreItemRich(selected.one_piece, occasion, vibe, weather);
        s += scoreItemRich(selected.shoes, occasion, vibe, weather);
        if (selected.mid) s += scoreItemRich(selected.mid, occasion, vibe, weather);
        s += scoreOutfitCoherence(selected, occasion, vibe);
        s += 28;
        if (selected.mid && isMidBlazer(selected.mid) && polishedContext(occasion, vibe)) s += 10;
        if (selected.mid && isMidCardigan(selected.mid)) s += 6;
        raw.push({ selected, localScore: s });
      }
    }
  }
  for (const top of tops) {
    for (const bottom of bottoms.filter((b) => bottomAllowedForLook(b, occasion, vibe))) {
      for (const shoes of shoelist) {
        for (const mid of midOptions) {
          const selected = { one_piece: null, top, bottom, shoes, mid, outerwear: null };
          if (!passesGrammar(selected, occasion, vibe)) continue;
          let s = 0;
          if (selected.top) s += scoreItemRich(selected.top, occasion, vibe, weather);
          if (selected.bottom) s += scoreItemRich(selected.bottom, occasion, vibe, weather);
          if (selected.shoes) s += scoreItemRich(selected.shoes, occasion, vibe, weather);
          if (selected.mid) s += scoreItemRich(selected.mid, occasion, vibe, weather);
          s += scoreOutfitCoherence(selected, occasion, vibe);
          if (selected.mid && polishedContext(occasion, vibe)) s += 12;
          if (selected.mid && isMidBlazer(selected.mid) && polishedContext(occasion, vibe) && selected.top) {
            const t = selected.top.type;
            if (t === 'Shirt' || t === 'Blouse') s += 18;
            else if (t === 'Sweater') s += 15;
            else if (t === 'T-Shirt' || t === 'Tank' || t === 'Camisole' || t === 'Bodysuit') s += 8;
          }
          if (selected.mid && isMidCardigan(selected.mid)) s += 6;
          raw.push({ selected, localScore: s });
        }
      }
    }
  }

  raw.sort((a, b) => b.localScore - a.localScore);
  const deduped = [];
  const seen = new Set();
  for (const c of raw) {
    const key = selectedKey(c.selected);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }
  return selectDiverseCandidates(deduped, MAX_CANDIDATES);
}

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
  let m = 128;
  const o = (occasion || '').toLowerCase();
  const v = (vibe || '').trim().toLowerCase();
  if (o === 'formal' || v === 'formal' || v === 'classy') m += 36;
  if (o === 'date night' && (v === 'classy' || v === 'formal')) m += 22;
  if (o === 'work' && (v === 'formal' || v === 'minimalist' || v === 'classy')) m += 26;
  if (v === 'minimalist' || v === 'formal') m += 12;
  if (occasionVibeClash(occasion, vibe)) m += 34;
  return m;
}

function pickWithVariety(candidates, userId, occasion, vibe, weather = '') {
  if (!candidates.length) return null;
  const topScore = candidates[0].localScore;
  const band = candidates.filter((c) => c.localScore >= topScore - PICK_QUALITY_BAND);
  if (band.length <= 1) return band[0];

  const topFreq = {};
  const shoeFreq = {};
  for (const c of band) {
    const tk = baseSignature(c.selected);
    const sk = wardrobeStyleSignature(c.selected.shoes);
    topFreq[tk] = (topFreq[tk] || 0) + 1;
    shoeFreq[sk] = (shoeFreq[sk] || 0) + 1;
  }

  const scored = band.map((c) => {
    const tk = baseSignature(c.selected);
    const sk = wardrobeStyleSignature(c.selected.shoes);
    const tf = topFreq[tk] || 1;
    const sf = shoeFreq[sk] || 1;
    const softPen = TOP_REPEAT_SOFT_PENALTY * (Math.max(0, tf - 1) + Math.max(0, sf - 1));
    return { c, adj: c.localScore - softPen };
  });
  scored.sort((a, b) => b.adj - a.adj);

  const bestAdj = scored[0].adj;
  const nearTie = scored.filter((x) => x.adj >= bestAdj - 3);
  let h = Number(userId) || 0;
  const seed = `${occasion}|${vibe}|${weather || ''}|pick`;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return nearTie[h % nearTie.length].c;
}

function isCasualDenimOuterwear(item) {
  if (!item) return false;
  const p = item.profile || {};
  if (p.subtype === 'denim_jacket' || p.materialVibe === 'denim') return true;
  const type = (item.type || '').trim().toLowerCase();
  const style = (item.style || '').toLowerCase();
  if (style === 'formal' || style === 'business') return false;
  const notes = (item.notes || '').toLowerCase();
  if (type === 'coat' && !/denim|jean/i.test(notes)) return false;
  if (type !== 'jacket' && type !== 'coat') return false;
  const color = (item.color || '').toLowerCase();
  const denimCue = color === 'blue' || /denim|jean/i.test(notes);
  const casualCue = style === 'casual' || style === 'streetwear' || style === 'vintage' || /denim|jean/i.test(notes);
  return denimCue || casualCue;
}

function scoreOuterwearLayer(ow, occasion, vibe, coreSelected, weather = '') {
  let s = scoreItemRich(ow, occasion, vibe, weather);
  const occ = (occasion || '').toLowerCase();
  const vib = (vibe || '').toLowerCase();
  const polished = polishedContext(occasion, vibe);

  if (isCasualDenimOuterwear(ow)) {
    if (polished) s -= 58;
    if (occ === 'school' && (vib === 'formal' || vib === 'classy')) s -= 42;
    if (vib === 'streetwear' || vib === 'vintage' || occ === 'weekend' || occ === 'casual') s += 4;
  }

  if ((ow.type || '').toLowerCase() === 'jacket' && (ow.style || '').toLowerCase() === 'casual') {
    if (polished) s -= 38;
  }

  const bottom = coreSelected.bottom;
  const onePiece = coreSelected.one_piece;
  if (bottom && isCasualDenimOuterwear(ow)) {
    const bt = (bottom.type || '').toLowerCase();
    const bc = (bottom.color || '').toLowerCase();
    if (bt === 'jeans' || bc === 'blue' || /jean|denim/i.test((bottom.notes || '').toLowerCase())) {
      s -= 24;
    }
  }
  if (onePiece && isCasualDenimOuterwear(ow)) {
    const ot = (onePiece.type || '').toLowerCase();
    const oc = (onePiece.color || '').toLowerCase();
    if (ot === 'dress' && (oc === 'blue' || /jean|denim/i.test((onePiece.notes || '').toLowerCase()))) {
      s -= 20;
    }
  }

  return s;
}

function occasionWantsOptionalLayer(occasion, vibe) {
  const occ = (occasion || '').toLowerCase();
  const vib = (vibe || '').toLowerCase();
  if (occ === 'outdoor') return true;
  if (occ === 'formal' && (vib === 'formal' || vib === 'classy' || vib === 'minimalist')) return true;
  if (occ === 'work' && (vib === 'formal' || vib === 'business' || vib === 'classy' || vib === 'minimalist')) return true;
  if (occ === 'date night' && (vib === 'classy' || vib === 'formal')) return true;
  return false;
}

function weatherWantsOuterwear(weather) {
  const w = String(weather || '').trim();
  return ['Rain', 'Snow', 'Cold'].includes(w);
}

function maybeAddOuterwear(selected, bySlot, occasion, vibe, coreScore, weather = '') {
  if (!bySlot.outerwear?.length) return { selected, added: false };
  const fromOccasion = occasionWantsOptionalLayer(occasion, vibe);
  const fromWeather = weatherWantsOuterwear(weather);
  const wantLayer = fromOccasion || fromWeather;

  let bestOw = null;
  let bestTotal = coreScore;
  for (const ow of bySlot.outerwear) {
    const sel = { ...selected, outerwear: ow };
    let s = 0;
    if (sel.top) s += scoreItemRich(sel.top, occasion, vibe, weather);
    if (sel.mid) s += scoreItemRich(sel.mid, occasion, vibe, weather);
    if (sel.bottom) s += scoreItemRich(sel.bottom, occasion, vibe, weather);
    if (sel.shoes) s += scoreItemRich(sel.shoes, occasion, vibe, weather);
    s += scoreOuterwearLayer(ow, occasion, vibe, selected, weather);
    s += scoreOutfitCoherence(sel, occasion, vibe);
    if (s > bestTotal) {
      bestTotal = s;
      bestOw = ow;
    }
  }
  const gain = bestTotal - coreScore;
  let threshold = 42;
  if (wantLayer) {
    if (fromWeather && !fromOccasion) threshold = 22;
    else threshold = 28;
  }
  if (bestOw && gain >= threshold) {
    return { selected: { ...selected, outerwear: bestOw }, added: true };
  }
  return { selected, added: false };
}

function rejectHint(occasion, vibe, candidates) {
  const pol = polishedContext(occasion, vibe);
  if (pol) {
    const hasBlazer = candidates?.some((c) => c?.selected?.mid && isMidBlazer(c.selected.mid));
    if (hasBlazer) {
      return 'If you use a blazer, pair it with a clean base such as a shirt, blouse, knit, dress, or jumpsuit, then finish with polished bottoms or a one-piece and refined shoes.';
    }
    return 'Try adding a polished base such as a blouse, shirt, dress, or jumpsuit, then pair it with tailored bottoms or a one-piece and refined shoes like flats, heels, dress shoes, or dress boots.';
  }
  if (casualishContext(occasion, vibe)) {
    return 'Try adding a flexible base such as a tee, tank, blouse, dress, or jumpsuit, then pair it with casual bottoms or a one-piece, plus shoes that fit the weather and vibe.';
  }
  return 'Add a few pieces that match the occasion and aesthetic you selected, then try again.';
}

/**
 * @returns {Promise<{ items, explanation, occasion, vibe, reranked?, candidateCount?, stylistConfidence? } | { error: string, suggestion?: string }>}
 */
async function generateOutfit(userId, occasion, vibe, weather = 'Cloudy') {
  const db = getDb();
  const rows = rowsToObjects(
    db.exec(
      'SELECT id, user_id, type, color, season, style, notes, image_path, created_at, garment_profile FROM wardrobe_items WHERE user_id = $uid',
      { $uid: userId }
    )
  );
  const items = rows.map(rowToItem).filter((i) => i.slot);

  const bySlot = { top: [], mid: [], one_piece: [], bottom: [], shoes: [], outerwear: [] };
  items.forEach((item) => {
    if (bySlot[item.slot]) bySlot[item.slot].push(item);
  });

  const hasOnePieceBase = bySlot.one_piece.length > 0;
  const hasSeparatesBase = bySlot.top.length > 0 && bySlot.bottom.length > 0;
  if ((!hasOnePieceBase && !hasSeparatesBase) || bySlot.shoes.length === 0) {
    return { error: INSUFFICIENT_MESSAGE, suggestion: rejectHint(occasion, vibe, []) };
  }

  let candidates = buildLocalCandidates(bySlot, occasion, vibe, weather);
  if (!candidates.length) {
    return {
      error: NOT_SUITABLE_MESSAGE,
      suggestion: rejectHint(occasion, vibe, []),
    };
  }

  const minScore = minAcceptableScore(occasion, vibe);
  candidates = candidates.filter((c) => c.localScore >= minScore);
  if (!candidates.length) {
    return {
      error: NOT_SUITABLE_MESSAGE,
      suggestion: rejectHint(occasion, vibe, []),
    };
  }

  let chosen = pickWithVariety(candidates, userId, occasion, vibe, weather);
  if (!chosen || chosen.localScore < minScore) {
    return {
      error: NOT_SUITABLE_MESSAGE,
      suggestion: rejectHint(occasion, vibe, candidates),
    };
  }

  let explanation = '';
  let reranked = false;
  let stylistConfidence = null;

  const rerank = await rerankOutfitCandidates(candidates, occasion, vibe, weather);
  if (rerank?.rejectAll && rerank.confidence === 'high') {
    return {
      error: rerank.stylistReason || NOT_SUITABLE_MESSAGE,
      suggestion: rerank.missingItemSuggestion || rejectHint(occasion, vibe, candidates),
    };
  }
  if (rerank && !rerank.rejectAll && candidates[rerank.chosenIndex]) {
    const alt = candidates[rerank.chosenIndex];
    if (alt.localScore >= minScore) {
      chosen = alt;
      explanation = rerank.stylistReason || buildExplanation(alt.selected, occasion, vibe, false, null, weather);
      reranked = true;
      stylistConfidence = rerank.confidence;
    }
  }

  const sortedForCompare = [...candidates].sort((a, b) => b.localScore - a.localScore);
  const chosenKeyCmp = selectedKey(chosen.selected);
  const runnerUp = sortedForCompare.find((c) => selectedKey(c.selected) !== chosenKeyCmp);
  let compare = null;
  if (!reranked && runnerUp && chosen.localScore - runnerUp.localScore <= 6) {
    compare = {
      altShort: formatOutfitFingerprint(runnerUp.selected),
      gap: chosen.localScore - runnerUp.localScore,
    };
  }

  let selected = { ...chosen.selected };
  const owResult = maybeAddOuterwear(selected, bySlot, occasion, vibe, chosen.localScore, weather);
  selected = owResult.selected;
  if (!reranked) {
    explanation = buildExplanation(selected, occasion, vibe, owResult.added, compare, weather);
  } else if (!explanation.trim()) {
    explanation = buildExplanation(selected, occasion, vibe, owResult.added, null, weather);
  } else if (owResult.added && selected.outerwear) {
    explanation = `${explanation.trim()} Added ${formatItemLabel(selected.outerwear)} as outerwear, only because it improves the look.`;
  }

  const outfitItems = [selected.one_piece, selected.top, selected.mid, selected.bottom, selected.shoes, selected.outerwear].filter(Boolean);
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
    weather: weather || 'Cloudy',
    reranked,
    candidateCount: candidates.length,
    stylistConfidence: stylistConfidence || undefined,
  };
}

module.exports = {
  generateOutfit,
  slotForType,
  scoreItem,
  pickBestForSlot: (items, occasion, vibe) => {
    const top = getTopKForSlot(items, occasion, vibe, 1, '');
    return top[0] || null;
  },
  SLOT_TYPES,
};
