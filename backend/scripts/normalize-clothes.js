/**
 * Dev-only: Normalize clothing assets from frontend/public/clothes to WEBP
 * and generate a metadata manifest for demo seeding.
 *
 * Usage: npm run normalize-clothes (from backend/)
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const VALID_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
const SRC_DIR = path.join(__dirname, '../../frontend/public/clothes');
const OUT_DIR = path.join(__dirname, '../../frontend/public/clothes-demo');
const MANIFEST_PATH = path.join(__dirname, '../../frontend/public/clothes-demo-manifest.json');

// Manual overrides for ambiguous filenames: { filename: { type, color, season, style } }
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
  { re: /shoes|jays|formal_|casual_shoes|adidas|campus/i, type: 'Sneakers' },
  { re: /boots/i, type: 'Boots' },
  { re: /sandals/i, type: 'Sandals' },
];

const COLOR_PATTERNS = [
  'white', 'black', 'grey', 'gray', 'brown', 'navy', 'blue', 'red', 'green',
  'cream', 'beige', 'olive', 'burgundy', 'pink', 'purple', 'orange', 'yellow'
];

function inferMetadata(filename) {
  const base = path.basename(filename, path.extname(filename)).toLowerCase();
  const override = OVERRIDES[path.basename(filename)];
  if (override) return override;

  let type = 'T-Shirt';
  for (const { re, type: t } of TYPE_PATTERNS) {
    if (re.test(base)) { type = t; break; }
  }
  if (/formal_|casual_shoes|jays|adidas|campus/i.test(base)) {
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

  const style = /formal|blazer/i.test(base) ? 'Formal' : /sport|adidas|jays/i.test(base) ? 'Sport' : 'Casual';
  const season = /shorts/i.test(base) ? 'Summer' : 'All Season';

  return { type, color, season, style };
}

function isValidImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return VALID_EXT.includes(ext) && !/!|#|\?/.test(filename);
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('Source dir not found:', SRC_DIR);
    process.exit(1);
  }

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SRC_DIR).filter(f => {
    const full = path.join(SRC_DIR, f);
    return fs.statSync(full).isFile() && isValidImageFile(f);
  });

  const ignored = fs.readdirSync(SRC_DIR).filter(f => {
    const full = path.join(SRC_DIR, f);
    return fs.statSync(full).isFile() && !isValidImageFile(f);
  });

  if (ignored.length) {
    console.log('Ignored (invalid):', ignored.join(', '));
  }

  const manifest = [];

  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const baseName = path.basename(file, path.extname(file));
    const outName = baseName + '.webp';
    const outPath = path.join(OUT_DIR, outName);

    try {
      await sharp(srcPath)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(outPath);
    } catch (err) {
      console.error('Failed:', file, err.message);
      continue;
    }

    const metadata = inferMetadata(file);
    manifest.push({
      sourceFile: file,
      outputFile: outName,
      imagePath: `/clothes-demo/${outName}`,
      ...metadata,
    });
    console.log('OK:', file, '->', outName);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('\nManifest written to', MANIFEST_PATH);
  console.log('Normalized:', manifest.length, 'files');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
