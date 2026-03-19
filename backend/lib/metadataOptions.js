/**
 * Canonical metadata options for wardrobe items.
 * Used to normalize analysis results to allowed dropdown values.
 */

const TYPES = [
  'Shirt', 'T-Shirt', 'Hoodie', 'Sweater', 'Jacket', 'Coat', 'Blazer',
  'Pants', 'Jeans', 'Shorts', 'Skirt', 'Dress', 'Shoes', 'Boots', 'Sneakers', 'Sandals',
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
  'tshirt': 'T-Shirt', 't-shirt': 'T-Shirt', 't shirt': 'T-Shirt', 'tee': 'T-Shirt',
  'hoody': 'Hoodie', 'sweatshirt': 'Hoodie', 'jumper': 'Sweater',
  'blazers': 'Blazer', 'trousers': 'Pants', 'denim': 'Jeans', 'short': 'Shorts',
  'dresses': 'Dress', 'sneaker': 'Sneakers', 'boot': 'Boots', 'sandal': 'Sandals',
  'accessory': 'Accessories', 'hats': 'Hat', 'jackets': 'Jacket', 'coats': 'Coat',
  'shirts': 'Shirt', 'pants': 'Pants', 'skirts': 'Skirt', 'shoes': 'Shoes'
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

module.exports = { TYPES, COLORS, SEASONS, STYLES, normalize, normalizeMetadata };
