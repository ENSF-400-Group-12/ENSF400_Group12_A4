/**
 * Dev-only: Normalize clothing assets from frontend/public/clothes to WEBP
 * and generate a metadata manifest for demo seeding.
 *
 * Usage: npm run normalize-clothes (from backend/)
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const VALID_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg'];
const SKIP_SOURCE_FILES = new Set([
  'brown_sweat_pants_source.png',
  'womens-white-brown-shoes.avif',
]);
const SRC_DIR = path.join(__dirname, '../../frontend/public/clothes');
const OUT_DIR_FRONTEND = path.join(__dirname, '../../frontend/public/clothes-demo');
const OUT_DIR_BACKEND = path.join(__dirname, '../demo/clothes-demo');
const MANIFEST_PATH_FRONTEND = path.join(__dirname, '../../frontend/public/clothes-demo-manifest.json');
const MANIFEST_PATH_BACKEND = path.join(__dirname, '../demo/clothes-demo-manifest.json');

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
  'ivory_work_blouse.svg': { type: 'Blouse', color: 'Ivory', season: 'All Season', style: 'Business' },
  'navy_cardigan_layer.svg': { type: 'Cardigan', color: 'Navy', season: 'Fall', style: 'Smart Casual' },
  'black_camisole_evening.svg': { type: 'Camisole', color: 'Black', season: 'Summer', style: 'Formal' },
  'white_tank_summer.svg': { type: 'Tank', color: 'White', season: 'Summer', style: 'Casual' },
  'black_bodysuit_minimal.svg': { type: 'Bodysuit', color: 'Black', season: 'All Season', style: 'Minimalist' },
  'emerald_wrap_dress_formal.svg': { type: 'Dress', color: 'Green', season: 'All Season', style: 'Formal' },
  'black_jumpsuit_evening.svg': { type: 'Jumpsuit', color: 'Black', season: 'All Season', style: 'Formal' },
  'berry_romper_summer.svg': { type: 'Romper', color: 'Burgundy', season: 'Summer', style: 'Casual' },
  'black_midi_skirt_work.svg': { type: 'Skirt', color: 'Black', season: 'All Season', style: 'Business' },
  'charcoal_leggings_cold.svg': { type: 'Leggings', color: 'Gray', season: 'Winter', style: 'Casual' },
  'nude_flats_polished.svg': { type: 'Flats', color: 'Beige', season: 'All Season', style: 'Smart Casual' },
  'black_heels_formal.svg': { type: 'Heels', color: 'Black', season: 'All Season', style: 'Formal' },
  'burgundy_dress_boots_cold.svg': { type: 'Dress Boots', color: 'Burgundy', season: 'Winter', style: 'Smart Casual' },
  'tan_sandals_summer.svg': { type: 'Sandals', color: 'Beige', season: 'Summer', style: 'Casual' },
  'camel_wool_coat_cold.svg': { type: 'Coat', color: 'Beige', season: 'Winter', style: 'Formal' },
  'navy_pleated_trousers_work.svg': { type: 'Pants', color: 'Navy', season: 'All Season', style: 'Business' },
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
  return VALID_EXT.includes(ext) && !SKIP_SOURCE_FILES.has(filename.toLowerCase()) && !/!|#|\?/.test(filename);
}

function listSourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
      continue;
    }
    if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('Source dir not found:', SRC_DIR);
    process.exit(1);
  }

  for (const dir of [OUT_DIR_FRONTEND, OUT_DIR_BACKEND]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sourceFiles = listSourceFiles(SRC_DIR);
  const files = sourceFiles.filter((full) => isValidImageFile(path.basename(full)));
  const ignored = sourceFiles
    .map((full) => path.relative(SRC_DIR, full))
    .filter((rel) => !isValidImageFile(path.basename(rel)));

  if (ignored.length) {
    console.log('Ignored (invalid):', ignored.join(', '));
  }

  const manifest = [];

  for (const srcPath of files) {
    const relPath = path.relative(SRC_DIR, srcPath);
    const sourceName = path.basename(srcPath);
    const baseName = path.basename(srcPath, path.extname(srcPath));
    const outName = baseName + '.webp';
    const outPathFrontend = path.join(OUT_DIR_FRONTEND, outName);
    const outPathBackend = path.join(OUT_DIR_BACKEND, outName);

    try {
      const makeWebp = () => sharp(srcPath)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 });
      await makeWebp().toFile(outPathFrontend);
      await makeWebp().toFile(outPathBackend);
    } catch (err) {
      console.error('Failed:', relPath, err.message);
      continue;
    }

    const metadata = inferMetadata(sourceName);
    manifest.push({
      sourceFile: relPath,
      outputFile: outName,
      imagePath: `/clothes-demo/${outName}`,
      ...metadata,
    });
    console.log('OK:', relPath, '->', outName);
  }

  const json = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(MANIFEST_PATH_FRONTEND, json, 'utf8');
  console.log('\nManifest written to', MANIFEST_PATH_FRONTEND);
  fs.writeFileSync(MANIFEST_PATH_BACKEND, json, 'utf8');
  console.log('Manifest copy for backend deploy bundle:', MANIFEST_PATH_BACKEND);
  console.log('Normalized:', manifest.length, 'files');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
