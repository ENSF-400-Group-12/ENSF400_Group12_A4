const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'closetai-generator-tests-'));
process.env.CLOSETAI_DATA_DIR = tempRoot;
process.env.CLOSETAI_DATABASE_PATH = path.join(tempRoot, 'app.db');
process.env.OPENAI_API_KEY = '';
process.env.OPENAI_OUTFIT_RERANK = '0';

const { initDb, getDb } = require('../db/connection');
const { generateOutfit, slotForType } = require('../services/outfitGenerator');

let db;
let nextUserId = 1;

async function setupDb() {
  await initDb();
  db = getDb();
}

function clearTables() {
  db.run('DELETE FROM wardrobe_items');
  db.run('DELETE FROM favorite_outfits');
  db.run('DELETE FROM users');
}

function createUser() {
  const email = `tester${nextUserId}@example.com`;
  db.run(
    'INSERT INTO users (id, email, password_hash, email_verified_at) VALUES ($id, $email, $hash, datetime(\'now\'))',
    { $id: nextUserId, $email: email, $hash: 'hash' }
  );
  nextUserId += 1;
  return nextUserId - 1;
}

function insertItem(userId, item) {
  db.run(
    `INSERT INTO wardrobe_items (user_id, type, color, season, style, notes, image_path, garment_profile)
     VALUES ($uid, $type, $color, $season, $style, $notes, $imagePath, $profile)`,
    {
      $uid: userId,
      $type: item.type,
      $color: item.color || 'Black',
      $season: item.season || 'All Season',
      $style: item.style || 'Casual',
      $notes: item.notes || '',
      $imagePath: item.image_path || `/demo/${String(item.type || 'item').toLowerCase().replace(/\s+/g, '-')}.webp`,
      $profile: item.garment_profile ? JSON.stringify(item.garment_profile) : null,
    }
  );
}

async function buildOutfit(occasion, vibe, weather, items) {
  clearTables();
  const userId = createUser();
  items.forEach((item) => insertItem(userId, item));
  return generateOutfit(userId, occasion, vibe, weather);
}

function itemTypes(outfit) {
  return (outfit.items || []).map((item) => item.type);
}

test.before(async () => {
  await setupDb();
});

test('slot mapping recognizes one-piece garments, layers, and expanded footwear', () => {
  assert.equal(slotForType('Dress'), 'one_piece');
  assert.equal(slotForType('Jumpsuit'), 'one_piece');
  assert.equal(slotForType('Romper'), 'one_piece');
  assert.equal(slotForType('Cardigan'), 'mid');
  assert.equal(slotForType('Heels'), 'shoes');
  assert.equal(slotForType('Flats'), 'shoes');
  assert.equal(slotForType('Dress Boots'), 'shoes');
});

test('formal classy generation supports dresses without forcing a bottom', async () => {
  const outfit = await buildOutfit('Formal', 'Classy', 'Cold', [
    { type: 'Dress', color: 'Green', style: 'Formal', notes: 'emerald wrap dress' },
    { type: 'Heels', color: 'Black', style: 'Formal', notes: 'sleek evening heels' },
    { type: 'Coat', color: 'Beige', style: 'Formal', notes: 'camel wool coat' },
    { type: 'Sneakers', color: 'White', style: 'Sport' },
  ]);

  const types = itemTypes(outfit);
  assert.ok(types.includes('Dress'));
  assert.ok(!types.includes('Pants'));
  assert.ok(!types.includes('Skirt'));
  assert.ok(types.includes('Heels'));
  assert.ok(!types.includes('Sneakers'));
});

test('work formal generation can build blouse plus skirt outfits with polished shoes', async () => {
  const outfit = await buildOutfit('Work', 'Formal', 'Cloudy', [
    { type: 'Blouse', color: 'Ivory', style: 'Business', notes: 'silk work blouse' },
    { type: 'Skirt', color: 'Black', style: 'Business', notes: 'midi skirt' },
    { type: 'Flats', color: 'Beige', style: 'Smart Casual', notes: 'pointed flats' },
    { type: 'Blazer', color: 'Navy', style: 'Formal', notes: 'tailored blazer' },
    { type: 'Sneakers', color: 'White', style: 'Sport' },
  ]);

  const types = itemTypes(outfit);
  assert.ok(types.includes('Blouse'));
  assert.ok(types.includes('Skirt'));
  assert.ok(types.includes('Flats'));
  assert.ok(!types.includes('Sneakers'));
});

test('date night classy prefers jumpsuit plus heels over a casual romper', async () => {
  const outfit = await buildOutfit('Date Night', 'Classy', 'Cloudy', [
    { type: 'Jumpsuit', color: 'Black', style: 'Formal', notes: 'tailored jumpsuit' },
    { type: 'Romper', color: 'Burgundy', style: 'Casual', notes: 'lightweight summer romper' },
    { type: 'Heels', color: 'Black', style: 'Formal' },
    { type: 'Sandals', color: 'Beige', style: 'Casual' },
  ]);

  const types = itemTypes(outfit);
  assert.ok(types.includes('Jumpsuit'));
  assert.ok(!types.includes('Romper'));
  assert.ok(types.includes('Heels'));
  assert.ok(!types.includes('Sandals'));
});

test('hot weather casual generation can use a romper and sandals', async () => {
  const outfit = await buildOutfit('Casual', 'Casual', 'Hot', [
    { type: 'Romper', color: 'Burgundy', style: 'Casual', notes: 'easy summer romper' },
    { type: 'Dress', color: 'Green', style: 'Formal', notes: 'formal wrap dress' },
    { type: 'Sandals', color: 'Beige', style: 'Casual' },
    { type: 'Heels', color: 'Black', style: 'Formal' },
  ]);

  const types = itemTypes(outfit);
  assert.ok(types.includes('Romper'));
  assert.ok(types.includes('Sandals'));
  assert.ok(!types.includes('Heels'));
});

test('cold outdoor casual generation can layer a cardigan and select boots', async () => {
  const outfit = await buildOutfit('Outdoor', 'Casual', 'Cold', [
    { type: 'Tank', color: 'White', style: 'Casual' },
    { type: 'Jeans', color: 'Blue', style: 'Casual' },
    { type: 'Cardigan', color: 'Navy', style: 'Smart Casual', notes: 'soft knit cardigan' },
    { type: 'Dress Boots', color: 'Burgundy', style: 'Smart Casual', notes: 'cold weather boots' },
    { type: 'Flats', color: 'Beige', style: 'Smart Casual' },
  ]);

  const types = itemTypes(outfit);
  assert.ok(types.includes('Cardigan'));
  assert.ok(types.includes('Dress Boots'));
  assert.ok(!types.includes('Flats'));
});

test('vintage casual generation still supports skirts with layers and polished boots', async () => {
  const outfit = await buildOutfit('Casual', 'Vintage', 'Cold', [
    { type: 'Blouse', color: 'Cream', style: 'Vintage', notes: 'soft vintage blouse' },
    { type: 'Skirt', color: 'Black', style: 'Vintage', notes: 'pleated midi skirt' },
    { type: 'Cardigan', color: 'Navy', style: 'Vintage', notes: 'cropped cardigan' },
    { type: 'Dress Boots', color: 'Brown', style: 'Vintage' },
  ]);

  const types = itemTypes(outfit);
  assert.ok(types.includes('Blouse'));
  assert.ok(types.includes('Skirt'));
  assert.ok(types.includes('Cardigan'));
  assert.ok(types.includes('Dress Boots'));
});
