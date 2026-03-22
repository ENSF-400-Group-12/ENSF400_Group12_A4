/**
 * Infer clothing metadata from filename only when the name strongly signals a category.
 * Does NOT default to generic T-Shirt/Black for random names (e.g. IMG_1234.jpg → no inference).
 */
const path = require('path');
const { normalizeMetadata } = require('./metadataOptions');

const OVERRIDES = {
  'jeans.webp': { type: 'Jeans', color: 'Blue', season: 'All Season', style: 'Casual' },
  'jean_shorts.webp': { type: 'Shorts', color: 'Blue', season: 'Summer', style: 'Casual' },
  'jean_jacket.jpg': { type: 'Jacket', color: 'Blue', season: 'All Season', style: 'Casual' },
  'formal_black.webp': { type: 'Shoes', color: 'Black', season: 'All Season', style: 'Formal' },
  'formal_brown.webp': { type: 'Shoes', color: 'Brown', season: 'All Season', style: 'Formal' },
  'adidas_brown.webp': { type: 'Sneakers', color: 'Brown', season: 'All Season', style: 'Sport' },
  'adidas_campus.jpg': { type: 'Sneakers', color: 'Brown', season: 'All Season', style: 'Sport' },
  'white_jays.webp': { type: 'Sneakers', color: 'White', season: 'All Season', style: 'Sport' },
  'red_jays.jpg': { type: 'Sneakers', color: 'Red', season: 'All Season', style: 'Sport' },
  'black_casual_shoes.jpg': { type: 'Shoes', color: 'Black', season: 'All Season', style: 'Casual' },
  'black_jordans.jpg': { type: 'Sneakers', color: 'Black', season: 'All Season', style: 'Sport' },
  'black_jordans.jpeg': { type: 'Sneakers', color: 'Black', season: 'All Season', style: 'Sport' },
  'black_jordans.png': { type: 'Sneakers', color: 'Black', season: 'All Season', style: 'Sport' },
};

/** Order matters: more specific patterns first (tee before shirt token). */
const TYPE_PATTERNS = [
  { re: /tee|t-?shirt|tshirt|\btop\b/i, type: 'T-Shirt' },
  { re: /hoodie|hoody|sweatshirt|zip[\s_-]?up|zipup|pullover/i, type: 'Hoodie' },
  { re: /blazer/i, type: 'Blazer' },
  { re: /jean[\s_-]?jacket|denim[\s_-]?jacket/i, type: 'Jacket' },
  { re: /jacket|bomber|windbreaker|anorak/i, type: 'Jacket' },
  { re: /sweater|jumper|cardigan|knit/i, type: 'Sweater' },
  { re: /sweat[\s_-]?pants|joggers|track[\s_-]?pants/i, type: 'Pants' },
  { re: /pants|chinos|khakis|trousers|slacks/i, type: 'Pants' },
  { re: /jeans|denim(?!.*jacket)/i, type: 'Jeans' },
  { re: /shorts/i, type: 'Shorts' },
  { re: /skirt/i, type: 'Skirt' },
  { re: /dress(?!.*shirt)/i, type: 'Dress' },
  { re: /sneaker|trainer|runners|jays|jordan|adidas|campus|yeezy|air[\s_-]?max|footwear/i, type: 'Sneakers' },
  { re: /boot\b|boots|chelsea|combat[\s_-]?boot/i, type: 'Boots' },
  { re: /sandal|slides|flip[\s_-]?flop/i, type: 'Sandals' },
  { re: /loafer|oxford|derby|heel|stiletto|mule|clog/i, type: 'Shoes' },
  { re: /\bshoe\b|shoes|footwear/i, type: 'Shoes' },
  { re: /button[\s_-]?up|buttonup|oxford[\s_-]?shirt|dress[\s_-]?shirt|polo|flannel|blouse/i, type: 'Shirt' },
  { re: /(^|[_\s-])shirt(?=$|[_\s-])/i, type: 'Shirt' },
  { re: /coat|trench|parka|peacoat/i, type: 'Coat' },
];

const COLOR_PATTERNS = [
  'white', 'black', 'grey', 'gray', 'brown', 'navy', 'blue', 'red', 'green',
  'cream', 'beige', 'olive', 'burgundy', 'pink', 'purple', 'orange', 'yellow',
];

function inferFromFilename(filename) {
  if (!filename || typeof filename !== 'string' || !filename.trim()) {
    return null;
  }
  const basename = path.basename(filename);
  const base = path.basename(filename, path.extname(filename)).toLowerCase();

  const override = OVERRIDES[basename];
  if (override) return override;

  let type = null;
  for (const { re, type: t } of TYPE_PATTERNS) {
    if (re.test(base)) {
      type = t;
      break;
    }
  }
  if (!type) return null;

  if (/formal_|casual_shoes|jays|jordan|adidas|campus|sneaker|trainer/i.test(base)) {
    type = base.includes('formal') && !/sneaker|trainer|jays|jordan|adidas|campus/i.test(base)
      ? 'Shoes'
      : 'Sneakers';
  }

  let color = null;
  for (const c of COLOR_PATTERNS) {
    if (base.includes(c)) {
      color = c.charAt(0).toUpperCase() + c.slice(1);
      if (c === 'grey') color = 'Gray';
      break;
    }
  }

  const style = /formal|blazer|oxford|loafer/i.test(base)
    ? 'Formal'
    : /sport|adidas|jays|jordan|sneaker|trainer|athletic/i.test(base)
      ? 'Sport'
      : 'Casual';

  let season = null;
  if (/shorts|summer/i.test(base)) season = 'Summer';
  else if (type && (color || /winter|fleece|parka|coat/i.test(base))) season = 'All Season';

  const raw = { type, style };
  if (color) raw.color = color;
  if (season) raw.season = season;

  const normalized = normalizeMetadata(raw);
  return Object.fromEntries(Object.entries(normalized).filter(([, v]) => v != null));
}

module.exports = { inferFromFilename };
