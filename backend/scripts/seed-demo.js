/**
 * Dev-only: Seed the database with demo wardrobe items from clothes-demo-manifest.
 * Creates demo@closetai.local / demodemo123 if needed.
 *
 * Usage: npm run seed-demo (from backend/)
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const MANIFEST_PATH = path.join(__dirname, '../../frontend/public/clothes-demo-manifest.json');
const DEMO_EMAIL = 'demo@closetai.local';
const DEMO_PASSWORD = 'demodemo123';

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('Run npm run normalize-clothes first.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const { initDb, getDb, persist } = require('../db/connection');

  await initDb();
  const db = getDb();

  let result = db.exec('SELECT id FROM users WHERE email = $email', { $email: DEMO_EMAIL });
  let userId;
  if (!result.length || !result[0].values.length) {
    const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
    db.run('INSERT INTO users (email, password_hash) VALUES ($email, $hash)', {
      $email: DEMO_EMAIL,
      $hash: hash,
    });
    result = db.exec('SELECT last_insert_rowid() as id');
    userId = result[0].values[0][0];
    console.log('Created demo user:', DEMO_EMAIL);
  } else {
    userId = result[0].values[0][0];
    console.log('Using existing demo user:', DEMO_EMAIL);
  }

  db.run('DELETE FROM wardrobe_items WHERE user_id = $uid', { $uid: userId });

  for (const item of manifest) {
    db.run(
      `INSERT INTO wardrobe_items (user_id, type, color, season, style, notes, image_path)
       VALUES ($uid, $type, $color, $season, $style, $notes, $path)`,
      {
        $uid: userId,
        $type: item.type,
        $color: item.color,
        $season: item.season,
        $style: item.style,
        $notes: item.notes || '',
        $path: item.imagePath,
      }
    );
  }

  persist();
  console.log('Seeded', manifest.length, 'demo items. Login as', DEMO_EMAIL, '/', DEMO_PASSWORD);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
