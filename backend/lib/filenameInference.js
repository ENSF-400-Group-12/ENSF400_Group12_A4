/**
 * Infer clothing metadata from filename (e.g. black_jays.jpg -> Sneakers, Black).
 * Used by image analysis when no real vision API is available.
 * Shared patterns with normalize-clothes script.
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

const TYPE_PATTERNS = [
  { re: /tee|t-shirt|tshirt/i, type: 'T-Shirt' },
  { re: /button_up|buttonup|shirt/i, type: 'Shirt' },
  { re: /hoodie|zip_up|zipup/i, type: 'Hoodie' },
  { re: /blazer/i, type: 'Blazer' },
  { re: /jacket/i, type: 'Jacket' },
  { re: /sweater/i, type: 'Sweater' },
  { re: /pants|sweat_pants|striped_pants/i, type: 'Pants' },
  { re: /jeans/i, type: 'Jeans' },
  { re: /shorts/i, type: 'Shorts' },
  { re: /skirt/i, type: 'Skirt' },
  { re: /dress/i, type: 'Dress' },
  { re: /shoes|jays|jordan|formal_|casual_shoes|adidas|campus/i, type: 'Sneakers' },
  { re: /boots/i, type: 'Boots' },
  { re: /sandals/i, type: 'Sandals' },
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

  let type = 'T-Shirt';
  for (const { re, type: t } of TYPE_PATTERNS) {
    if (re.test(base)) {
      type = t;
      break;
    }
  }
  if (/formal_|casual_shoes|jays|jordan|adidas|campus/i.test(base)) {
    type = base.includes('formal') ? 'Shoes' : 'Sneakers';
  }

  let color = 'Black';
  for (const c of COLOR_PATTERNS) {
    if (base.includes(c)) {
      color = c.charAt(0).toUpperCase() + c.slice(1);
      if (c === 'grey') color = 'Gray';
      break;
    }
  }

  const style = /formal|blazer/i.test(base) ? 'Formal' : /sport|adidas|jays|jordan/i.test(base) ? 'Sport' : 'Casual';
  const season = /shorts/i.test(base) ? 'Summer' : 'All Season';

  const raw = { type, color, season, style };
  const normalized = normalizeMetadata(raw);
  return Object.fromEntries(Object.entries(normalized).filter(([, v]) => v != null));
}

module.exports = { inferFromFilename };
