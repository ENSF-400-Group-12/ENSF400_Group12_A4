/**
 * Canonical metadata options for wardrobe items.
 * Used to normalize analysis results to allowed dropdown values.
 */

const TYPES = [
  'Shirt', 'Blouse', 'T-Shirt', 'Tank', 'Camisole', 'Bodysuit',
  'Hoodie', 'Sweater', 'Cardigan', 'Jacket', 'Coat', 'Blazer',
  'Dress', 'Jumpsuit', 'Romper',
  'Pants', 'Jeans', 'Leggings', 'Shorts', 'Skirt',
  'Shoes', 'Heels', 'Flats', 'Boots', 'Dress Boots', 'Sneakers', 'Sandals',
  'Hat', 'Accessories'
];

const COLORS = [
  'Black', 'White', 'Gray', 'Brown', 'Beige', 'Navy', 'Blue', 'Light Blue',
  'Red', 'Burgundy', 'Green', 'Olive', 'Yellow', 'Orange', 'Purple', 'Pink', 'Cream'
];

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All Season'];

const STYLES = [
  'Casual', 'Formal', 'Business', 'Streetwear', 'Sport', 'Athletic',
  'Minimalist', 'Vintage', 'Smart Casual'
];

/** Synonyms / variants that map to a canonical value (lowercase key -> canonical) */
const TYPE_SYNONYMS = {
  blouse: 'Blouse', blouses: 'Blouse',
  'tshirt': 'T-Shirt', 't-shirt': 'T-Shirt', 't shirt': 'T-Shirt', 'tee': 'T-Shirt',
  tank: 'Tank', tanks: 'Tank', tanktop: 'Tank', 'tank top': 'Tank',
  camisole: 'Camisole', cami: 'Camisole', camis: 'Camisole',
  bodysuit: 'Bodysuit', bodysuits: 'Bodysuit', bodysuit_top: 'Bodysuit',
  'hoody': 'Hoodie', 'sweatshirt': 'Hoodie', 'jumper': 'Sweater',
  cardigan: 'Cardigan', cardigans: 'Cardigan',
  'blazers': 'Blazer', 'trousers': 'Pants', 'denim': 'Jeans', 'short': 'Shorts',
  leggings: 'Leggings', legging: 'Leggings',
  'dresses': 'Dress', jumpsuits: 'Jumpsuit', rompers: 'Romper',
  heels: 'Heels', heel: 'Heels', pumps: 'Heels',
  flats: 'Flats', flat: 'Flats', ballerinas: 'Flats',
  'dress boot': 'Dress Boots', 'dress boots': 'Dress Boots',
  'sneaker': 'Sneakers', 'boot': 'Boots', 'sandal': 'Sandals',
  'accessory': 'Accessories', 'hats': 'Hat', 'jackets': 'Jacket', 'coats': 'Coat',
  'shirts': 'Shirt', 'pants': 'Pants', 'skirts': 'Skirt', 'shoes': 'Shoes'
};

const TYPE_DUPLICATE_FAMILY = {
  Shirt: 'shirt_like',
  Blouse: 'shirt_like',
  Shoes: 'polished_footwear',
  Heels: 'polished_footwear',
  Flats: 'polished_footwear',
  Boots: 'boots',
  'Dress Boots': 'boots',
};

const COLOR_SYNONYMS = {
  'grey': 'Gray', 'navy blue': 'Navy', 'light blue': 'Light Blue', 'dark blue': 'Navy',
  'maroon': 'Burgundy', 'burgundy': 'Burgundy', 'olive green': 'Olive', 'beige': 'Beige',
  'cream': 'Cream', 'white': 'White', 'black': 'Black', 'brown': 'Brown',
  'red': 'Red', 'blue': 'Blue', 'green': 'Green', 'yellow': 'Yellow', 'orange': 'Orange',
  'purple': 'Purple', 'pink': 'Pink'
};

const SEASON_SYNONYMS = {
  'all season': 'All Season', 'all seasons': 'All Season', 'year-round': 'All Season',
  'spring': 'Spring', 'summer': 'Summer', 'fall': 'Fall', 'autumn': 'Fall',
  'winter': 'Winter'
};

const STYLE_SYNONYMS = {
  'casual': 'Casual', 'formal': 'Formal', 'business': 'Business',
  'streetwear': 'Streetwear', 'sport': 'Sport', 'athletic': 'Athletic',
  'sporty': 'Sport', 'minimalist': 'Minimalist', 'vintage': 'Vintage',
  'smart casual': 'Smart Casual', 'smart-casual': 'Smart Casual'
};

function normalize(value, allowedList, synonymMap = {}) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  const exact = allowedList.find((opt) => opt.toLowerCase() === lower);
  if (exact) return exact;

  if (synonymMap[lower]) return synonymMap[lower];

  const contains = allowedList.find((opt) => opt.toLowerCase().includes(lower) || lower.includes(opt.toLowerCase()));
  if (contains) return contains;

  return null;
}

function normalizeMetadata(raw) {
  const result = {};
  if (raw.type != null) {
    result.type = normalize(raw.type, TYPES, TYPE_SYNONYMS);
  }
  if (raw.color != null) {
    result.color = normalize(raw.color, COLORS, COLOR_SYNONYMS);
  }
  if (raw.season != null) {
    result.season = normalize(raw.season, SEASONS, SEASON_SYNONYMS);
  }
  if (raw.style != null) {
    result.style = normalize(raw.style, STYLES, STYLE_SYNONYMS);
  }
  return result;
}

function normalizeType(value) {
  return normalize(value, TYPES, TYPE_SYNONYMS);
}

function normalizeTypeForDuplicates(value) {
  const canonical = normalizeType(value);
  if (!canonical) return null;
  return TYPE_DUPLICATE_FAMILY[canonical] || canonical;
}

module.exports = {
  TYPES,
  COLORS,
  SEASONS,
  STYLES,
  normalize,
  normalizeType,
  normalizeTypeForDuplicates,
  normalizeMetadata,
};
