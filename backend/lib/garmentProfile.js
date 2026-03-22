/**
 * Rich garment metadata (optional JSON on wardrobe_items).
 * Backward compatible: missing column or null → derive from type/color/style/notes.
 */

const UNSPECIFIED = 'unspecified';

const CATEGORY = ['top', 'bottom', 'shoes', 'outerwear', 'mid_layer', UNSPECIFIED];

const SUBTYPE = [
  UNSPECIFIED,
  'tee',
  'button_up',
  'polo',
  'hoodie',
  'crewneck_sweater',
  'cardigan',
  'blazer',
  'denim_jacket',
  'bomber_jacket',
  'light_jacket',
  'trench_coat',
  'wool_coat',
  'dress',
  'skirt',
  'dress_pants',
  'chinos',
  'jeans',
  'joggers',
  'shorts',
  'sneakers',
  'dress_shoes',
  'loafers',
  'chelsea_boots',
  'hiking_boots',
  'sandals',
  'other',
];

const FORMALITY = [UNSPECIFIED, 'low', 'medium_low', 'medium', 'medium_high', 'high'];
const SILHOUETTE = [UNSPECIFIED, 'slim', 'regular', 'relaxed', 'oversized', 'tailored'];
const MATERIAL_VIBE = [
  UNSPECIFIED,
  'denim',
  'knit',
  'fleece',
  'leather',
  'athletic',
  'suiting',
  'cotton',
  'jersey',
  'wool',
  'synthetic',
];
const PATTERN = [UNSPECIFIED, 'solid', 'striped', 'plaid', 'graphic', 'washed', 'distressed', 'textured'];
const LAYER_ROLE = [UNSPECIFIED, 'base', 'mid', 'outer'];
const STATEMENT = [UNSPECIFIED, 'neutral', 'accent', 'statement'];
const COLOR_FAMILY = [
  UNSPECIFIED,
  'black',
  'white',
  'gray',
  'navy',
  'brown',
  'beige',
  'green',
  'red',
  'blue',
  'earth',
  'multicolor',
];
const WARMTH = [UNSPECIFIED, 'light', 'medium', 'heavy'];
const VERSATILITY = [UNSPECIFIED, 'casual_only', 'smart_casual', 'formal_capable', 'sporty'];

function inEnum(v, list) {
  return v && list.includes(v) ? v : null;
}

function stripUnspecified(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const [k, val] of Object.entries(obj)) {
    if (val == null || val === '' || val === UNSPECIFIED) continue;
    out[k] = val;
  }
  return out;
}

function colorToFamily(color) {
  if (!color) return UNSPECIFIED;
  const c = String(color).trim().toLowerCase();
  if (/^black$/i.test(c)) return 'black';
  if (/^white|cream$/i.test(c)) return 'white';
  if (/gray|grey/i.test(c)) return 'gray';
  if (/navy/i.test(c)) return 'navy';
  if (/brown|burgundy/i.test(c)) return 'brown';
  if (/beige|tan|khaki|olive/i.test(c)) return 'beige';
  if (/green|olive/i.test(c)) return 'green';
  if (/red|burgundy|pink|orange|yellow|purple/i.test(c)) return 'red';
  if (/blue|light blue/i.test(c)) return 'blue';
  return 'earth';
}

function typeToCategory(type) {
  const t = (type || '').trim();
  if (!t) return UNSPECIFIED;
  if (t === 'Blazer') return 'mid_layer';
  if (['Shirt', 'T-Shirt', 'Hoodie', 'Sweater', 'Dress'].includes(t)) return 'top';
  if (['Pants', 'Jeans', 'Shorts', 'Skirt'].includes(t)) return 'bottom';
  if (['Shoes', 'Boots', 'Sneakers', 'Sandals'].includes(t)) return 'shoes';
  if (['Jacket', 'Coat'].includes(t)) return 'outerwear';
  return UNSPECIFIED;
}

function typeToSubtype(type, notes) {
  const t = (type || '').trim();
  const n = (notes || '').toLowerCase();
  const map = {
    'T-Shirt': 'tee',
    Shirt: 'button_up',
    Hoodie: 'hoodie',
    Sweater: 'crewneck_sweater',
    Blazer: 'blazer',
    Jacket: /denim|jean/i.test(n) ? 'denim_jacket' : /bomber/i.test(n) ? 'bomber_jacket' : 'light_jacket',
    Coat: /trench/i.test(n) ? 'trench_coat' : 'wool_coat',
    Dress: 'dress',
    Skirt: 'skirt',
    Pants: /chino|khaki/i.test(n) ? 'chinos' : /dress|slack|trouser/i.test(n) ? 'dress_pants' : /jogger|track/i.test(n) ? 'joggers' : 'dress_pants',
    Jeans: 'jeans',
    Shorts: 'shorts',
    Sneakers: 'sneakers',
    Shoes: /loafer/i.test(n) ? 'loafers' : 'dress_shoes',
    Boots: /chelsea/i.test(n) ? 'chelsea_boots' : /hik|work/i.test(n) ? 'hiking_boots' : 'chelsea_boots',
    Sandals: 'sandals',
  };
  return map[t] || UNSPECIFIED;
}

function styleToFormality(style) {
  const s = (style || '').toLowerCase();
  if (/formal|business/.test(s)) return 'high';
  if (/smart casual|classy/.test(s)) return 'medium_high';
  if (/minimalist/.test(s)) return 'medium';
  if (/streetwear|vintage|casual/.test(s)) return 'medium_low';
  if (/sport|athletic/.test(s)) return 'low';
  return 'medium';
}

function styleToVersatility(style) {
  const s = (style || '').toLowerCase();
  if (/formal|business|smart casual/.test(s)) return 'formal_capable';
  if (/sport|athletic/.test(s)) return 'sporty';
  if (/minimalist|vintage|streetwear/.test(s)) return 'smart_casual';
  return 'casual_only';
}

function typeToLayerRole(type) {
  const t = (type || '').trim();
  if (t === 'Blazer') return 'mid';
  if (['Jacket', 'Coat'].includes(t)) return 'outer';
  if (['Shirt', 'T-Shirt', 'Hoodie', 'Sweater', 'Dress'].includes(t)) return 'base';
  return UNSPECIFIED;
}

function typeToMaterialVibe(type, notes) {
  const t = (type || '').trim();
  const n = (notes || '').toLowerCase();
  if (t === 'Jeans' || /denim|jean/i.test(n)) return 'denim';
  if (t === 'Hoodie' || t === 'Sweater' || /fleece|knit|wool/i.test(n)) return 'knit';
  if (t === 'Blazer' || /suit|wool suit/i.test(n)) return 'suiting';
  if (/leather/i.test(n)) return 'leather';
  if (t === 'Sneakers' || /mesh|tech/i.test(n)) return 'athletic';
  if (t === 'T-Shirt' || t === 'Shirt') return 'cotton';
  return UNSPECIFIED;
}

/**
 * Merge stored JSON profile with deterministic inference from legacy fields.
 * @param {{ type?: string, color?: string, style?: string, notes?: string, garment_profile?: string|null }} row
 * @returns {object} profile with only known keys, no unspecified values in output for "empty" checks use hasRichProfile
 */
function resolveGarmentProfile(row) {
  let stored = {};
  if (row.garment_profile && typeof row.garment_profile === 'string' && row.garment_profile.trim()) {
    try {
      stored = JSON.parse(row.garment_profile);
    } catch (_) {
      stored = {};
    }
  }
  const type = row.type;
  const color = row.color;
  const style = row.style;
  const notes = row.notes || '';

  const inferred = {
    category: typeToCategory(type),
    subtype: typeToSubtype(type, notes),
    formality: styleToFormality(style),
    silhouette: UNSPECIFIED,
    materialVibe: typeToMaterialVibe(type, notes),
    patternOrTexture: UNSPECIFIED,
    layerRole: typeToLayerRole(type),
    statementLevel: 'neutral',
    colorFamily: colorToFamily(color),
    warmth: UNSPECIFIED,
    versatility: styleToVersatility(style),
  };

  const merged = { ...inferred, ...stored };
  merged.category = inEnum(merged.category, CATEGORY) || inferred.category;
  merged.subtype = inEnum(merged.subtype, SUBTYPE) || inferred.subtype;
  merged.formality = inEnum(merged.formality, FORMALITY) || inferred.formality;
  merged.silhouette = inEnum(merged.silhouette, SILHOUETTE) || UNSPECIFIED;
  merged.materialVibe = inEnum(merged.materialVibe, MATERIAL_VIBE) || inferred.materialVibe;
  merged.patternOrTexture = inEnum(merged.patternOrTexture, PATTERN) || UNSPECIFIED;
  merged.layerRole = inEnum(merged.layerRole, LAYER_ROLE) || inferred.layerRole;
  merged.statementLevel = inEnum(merged.statementLevel, STATEMENT) || 'neutral';
  merged.colorFamily = inEnum(merged.colorFamily, COLOR_FAMILY) || colorToFamily(color);
  merged.warmth = inEnum(merged.warmth, WARMTH) || UNSPECIFIED;
  merged.versatility = inEnum(merged.versatility, VERSATILITY) || inferred.versatility;

  return merged;
}

function profileForApi(row) {
  const p = resolveGarmentProfile(row);
  return stripUnspecified(p);
}

/**
 * Normalize OpenAI / client profile object (all string enums including unspecified).
 */
function normalizeGarmentProfileInput(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const o = {
    category: inEnum(raw.category, CATEGORY),
    subtype: inEnum(raw.subtype, SUBTYPE),
    formality: inEnum(raw.formality, FORMALITY),
    silhouette: inEnum(raw.silhouette, SILHOUETTE),
    materialVibe: inEnum(raw.materialVibe, MATERIAL_VIBE),
    patternOrTexture: inEnum(raw.patternOrTexture, PATTERN),
    layerRole: inEnum(raw.layerRole, LAYER_ROLE),
    statementLevel: inEnum(raw.statementLevel, STATEMENT),
    colorFamily: inEnum(raw.colorFamily, COLOR_FAMILY),
    warmth: inEnum(raw.warmth, WARMTH),
    versatility: inEnum(raw.versatility, VERSATILITY),
  };
  return stripUnspecified(o);
}

function serializeProfileForDb(profileObj) {
  const s = stripUnspecified(profileObj || {});
  return Object.keys(s).length ? JSON.stringify(s) : null;
}

function formalityRank(f) {
  const order = { low: 1, medium_low: 2, medium: 3, medium_high: 4, high: 5 };
  return order[f] || 3;
}

module.exports = {
  UNSPECIFIED,
  CATEGORY,
  SUBTYPE,
  FORMALITY,
  SILHOUETTE,
  MATERIAL_VIBE,
  PATTERN,
  LAYER_ROLE,
  STATEMENT,
  COLOR_FAMILY,
  WARMTH,
  VERSATILITY,
  resolveGarmentProfile,
  profileForApi,
  normalizeGarmentProfileInput,
  serializeProfileForDb,
  stripUnspecified,
  formalityRank,
  typeToCategory,
  typeToSubtype,
};
