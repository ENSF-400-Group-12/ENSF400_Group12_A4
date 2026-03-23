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
  'womens-beige-pants.jpg': { type: 'Pants', color: 'Beige', season: 'All Season', style: 'Smart Casual' },
  'womens-black-comfy-shoes.webp': { type: 'Flats', color: 'Black', season: 'All Season', style: 'Casual' },
  'womens-black-formal-pants.webp': { type: 'Pants', color: 'Black', season: 'All Season', style: 'Formal' },
  'womens-black-shoes-formal.jpg': { type: 'Heels', color: 'Black', season: 'All Season', style: 'Formal' },
  'womens-brown-formal-pants.webp': { type: 'Pants', color: 'Brown', season: 'All Season', style: 'Formal' },
  'womens-button-up.webp': { type: 'Blouse', color: 'White', season: 'All Season', style: 'Business' },
  'womens-button-up-blue.webp': { type: 'Blouse', color: 'Blue', season: 'All Season', style: 'Business' },
  'womens-button-up-green.webp': { type: 'Blouse', color: 'Green', season: 'All Season', style: 'Business' },
  'womens-trench-coat.webp': { type: 'Coat', color: 'Beige', season: 'Fall', style: 'Formal' },
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

function inferSection(relPath) {
  const normalized = String(relPath || '').replace(/\\/g, '/').toLowerCase();
  return normalized.startsWith('womens/') ? 'womens' : 'mens';
}

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

function clearGeneratedWebps(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      clearGeneratedWebps(full);
      continue;
    }
    if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.webp') {
      fs.unlinkSync(full);
    }
  }
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
    clearGeneratedWebps(dir);
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
      demoSection: inferSection(relPath),
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
