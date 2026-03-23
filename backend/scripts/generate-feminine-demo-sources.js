const fs = require('node:fs');
const path = require('node:path');

const OUT_DIR = path.join(__dirname, '../../frontend/public/clothes/womens');

const ITEMS = [
  { file: 'ivory_work_blouse.svg', kind: 'blouse', fill: '#efe4d2', accent: '#d7c5ab' },
  { file: 'navy_cardigan_layer.svg', kind: 'cardigan', fill: '#21324a', accent: '#5f7496' },
  { file: 'black_camisole_evening.svg', kind: 'camisole', fill: '#191919', accent: '#4a4a4a' },
  { file: 'white_tank_summer.svg', kind: 'tank', fill: '#f5f3ee', accent: '#d5d2cb' },
  { file: 'black_bodysuit_minimal.svg', kind: 'bodysuit', fill: '#121212', accent: '#4e4e4e' },
  { file: 'emerald_wrap_dress_formal.svg', kind: 'dress', fill: '#0f6c5a', accent: '#47a693' },
  { file: 'black_jumpsuit_evening.svg', kind: 'jumpsuit', fill: '#191919', accent: '#535353' },
  { file: 'berry_romper_summer.svg', kind: 'romper', fill: '#8b3658', accent: '#cb7d9d' },
  { file: 'black_midi_skirt_work.svg', kind: 'skirt', fill: '#171717', accent: '#4a4a4a' },
  { file: 'charcoal_leggings_cold.svg', kind: 'leggings', fill: '#2b3138', accent: '#5a6571' },
  { file: 'nude_flats_polished.svg', kind: 'flats', fill: '#d7b7a1', accent: '#f0d8c5' },
  { file: 'black_heels_formal.svg', kind: 'heels', fill: '#171717', accent: '#4c4c4c' },
  { file: 'burgundy_dress_boots_cold.svg', kind: 'dress_boots', fill: '#6a2238', accent: '#b3697f' },
  { file: 'tan_sandals_summer.svg', kind: 'sandals', fill: '#c79b6d', accent: '#eed4b7' },
  { file: 'camel_wool_coat_cold.svg', kind: 'coat', fill: '#b98b61', accent: '#e3c6a2' },
  { file: 'navy_pleated_trousers_work.svg', kind: 'trousers', fill: '#223451', accent: '#6d81a6' },
];

function topBase(fill, accent, hemY = 500) {
  return `
    <path d="M260 210 L330 170 L470 170 L540 210 L586 355 L520 380 L490 308 L490 ${hemY} L310 ${hemY} L310 308 L280 380 L214 355 Z"
      fill="${fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
    <path d="M330 170 Q400 120 470 170" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
  `;
}

function dressShape(fill, accent, shortHem = false) {
  const hemY = shortHem ? 525 : 640;
  const flare = shortHem ? 130 : 190;
  return `
    <path d="M295 190 L360 155 L440 155 L505 190 L535 300 L470 322 L446 246 L430 280 L${400 + flare} ${hemY} L${400 - flare} ${hemY} L370 280 L354 246 L330 322 L265 300 Z"
      fill="${fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
    <path d="M356 220 L444 220" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
    <path d="M360 250 Q400 286 440 250" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round" />
  `;
}

function pantsShape(fill, accent, slim = false) {
  const leftOuter = slim ? 346 : 324;
  const rightOuter = slim ? 454 : 476;
  const ankleLeft = slim ? 352 : 340;
  const ankleRight = slim ? 448 : 460;
  return `
    <path d="M320 170 L480 170 L500 292 L452 650 L392 650 L384 392 L372 650 L312 650 L300 292 Z"
      fill="${fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
    <path d="M${leftOuter} 170 L400 170 L388 648 L${ankleLeft} 648 Z" fill="${fill}" opacity="0.98" />
    <path d="M400 170 L${rightOuter} 170 L${ankleRight} 648 L412 648 Z" fill="${fill}" opacity="0.98" />
    <path d="M340 220 L460 220" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
  `;
}

function footwearPair(leftPath, rightPath, fill, accent) {
  return `
    <path d="${leftPath}" fill="${fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
    <path d="${rightPath}" fill="${fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
    <path d="M246 505 L354 505" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
    <path d="M446 505 L554 505" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
  `;
}

function garmentSvg(item) {
  let body = '';
  switch (item.kind) {
    case 'blouse':
      body = `${topBase(item.fill, item.accent, 520)}
        <path d="M384 170 L416 170 L426 265 L400 300 L374 265 Z" fill="${item.accent}" opacity="0.92" />`;
      break;
    case 'cardigan':
      body = `${topBase(item.fill, item.accent, 545)}
        <path d="M392 170 L360 545 M408 170 L440 545" stroke="${item.accent}" stroke-width="12" stroke-linecap="round" />
        <circle cx="400" cy="298" r="8" fill="${item.accent}" />
        <circle cx="400" cy="340" r="8" fill="${item.accent}" />
        <circle cx="400" cy="382" r="8" fill="${item.accent}" />`;
      break;
    case 'camisole':
      body = `
        <path d="M316 208 L366 186 L434 186 L484 208 L470 516 L330 516 Z"
          fill="${item.fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
        <path d="M342 188 Q350 138 378 138 M458 188 Q450 138 422 138"
          fill="none" stroke="${item.accent}" stroke-width="8" stroke-linecap="round" />
        <path d="M346 240 L454 240" stroke="${item.accent}" stroke-width="9" stroke-linecap="round" />`;
      break;
    case 'tank':
      body = `
        <path d="M320 178 L360 168 L390 214 L410 214 L440 168 L480 178 L492 236 L470 520 L330 520 L308 236 Z"
          fill="${item.fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
        <path d="M352 194 Q400 146 448 194" fill="none" stroke="${item.accent}" stroke-width="8" stroke-linecap="round" />`;
      break;
    case 'bodysuit':
      body = `
        <path d="M325 182 L370 164 L430 164 L475 182 L488 246 L466 550 L422 622 L378 622 L334 550 L312 246 Z"
          fill="${item.fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
        <path d="M350 230 L450 230" stroke="${item.accent}" stroke-width="9" stroke-linecap="round" />`;
      break;
    case 'dress':
      body = dressShape(item.fill, item.accent, false);
      break;
    case 'jumpsuit':
      body = `
        <path d="M292 188 L350 156 L450 156 L508 188 L534 305 L474 332 L450 252 L432 312 L470 654 L414 654 L400 414 L386 654 L330 654 L368 312 L350 252 L326 332 L266 305 Z"
          fill="${item.fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
        <path d="M352 222 L448 222" stroke="${item.accent}" stroke-width="10" stroke-linecap="round" />`;
      break;
    case 'romper':
      body = `
        <path d="M296 188 L356 156 L444 156 L504 188 L530 302 L472 326 L448 248 L430 300 L446 530 L404 570 L396 570 L354 530 L370 300 L352 248 L328 326 L270 302 Z"
          fill="${item.fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
        <path d="M356 222 L444 222" stroke="${item.accent}" stroke-width="10" stroke-linecap="round" />`;
      break;
    case 'skirt':
      body = `
        <path d="M326 206 L474 206 L520 624 L280 624 Z"
          fill="${item.fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
        <path d="M338 246 L462 246" stroke="${item.accent}" stroke-width="10" stroke-linecap="round" />
        <path d="M360 246 L332 624 M400 246 L400 624 M440 246 L468 624"
          stroke="${item.accent}" stroke-opacity="0.65" stroke-width="7" stroke-linecap="round" />`;
      break;
    case 'leggings':
      body = pantsShape(item.fill, item.accent, true);
      break;
    case 'trousers':
      body = pantsShape(item.fill, item.accent, false);
      break;
    case 'flats':
      body = footwearPair(
        'M236 500 Q266 450 330 450 Q350 450 356 478 Q360 495 348 510 L258 528 Q226 528 236 500 Z',
        'M436 500 Q466 450 530 450 Q550 450 556 478 Q560 495 548 510 L458 528 Q426 528 436 500 Z',
        item.fill,
        item.accent
      );
      break;
    case 'heels':
      body = `
        <path d="M240 486 Q264 446 322 446 Q342 446 352 472 L336 498 L274 514 L240 512 Z"
          fill="${item.fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
        <path d="M440 486 Q464 446 522 446 Q542 446 552 472 L536 498 L474 514 L440 512 Z"
          fill="${item.fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
        <path d="M314 512 L308 594 M514 512 L508 594" stroke="${item.fill}" stroke-width="12" stroke-linecap="round" />
        <path d="M252 500 L346 500 M452 500 L546 500" stroke="${item.accent}" stroke-width="9" stroke-linecap="round" />`;
      break;
    case 'dress_boots':
      body = footwearPair(
        'M254 300 L340 300 L344 510 L368 540 L360 592 L250 592 L254 538 L236 510 L236 360 Z',
        'M454 300 L540 300 L544 510 L568 540 L560 592 L450 592 L454 538 L436 510 L436 360 Z',
        item.fill,
        item.accent
      );
      break;
    case 'sandals':
      body = `
        <path d="M244 504 Q276 458 334 458 Q350 458 360 478 L356 510 L262 522 Q232 522 244 504 Z"
          fill="${item.fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
        <path d="M444 504 Q476 458 534 458 Q550 458 560 478 L556 510 L462 522 Q432 522 444 504 Z"
          fill="${item.fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
        <path d="M268 486 L340 486 M462 486 L534 486 M286 508 L320 466 M480 508 L514 466"
          stroke="${item.accent}" stroke-width="10" stroke-linecap="round" />`;
      break;
    case 'coat':
      body = `
        <path d="M280 170 L350 136 L450 136 L520 170 L570 352 L510 378 L484 294 L474 662 L426 662 L404 436 L396 436 L374 662 L326 662 L316 294 L290 378 L230 352 Z"
          fill="${item.fill}" stroke="#212121" stroke-opacity="0.18" stroke-width="8" />
        <path d="M352 136 L400 246 L448 136" fill="none" stroke="${item.accent}" stroke-width="10" stroke-linecap="round" />
        <path d="M392 246 L364 662 M408 246 L436 662" stroke="${item.accent}" stroke-width="9" stroke-linecap="round" />`;
      break;
    default:
      body = topBase(item.fill, item.accent, 520);
      break;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#faf7f2" />
      <stop offset="100%" stop-color="#f1ece3" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#2d2216" flood-opacity="0.15" />
    </filter>
  </defs>
  <rect width="800" height="800" fill="url(#bg)" />
  <ellipse cx="400" cy="706" rx="180" ry="28" fill="#d8d1c8" opacity="0.42" />
  <g filter="url(#shadow)">
    ${body}
  </g>
</svg>`;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main() {
  ensureDir(OUT_DIR);
  for (const item of ITEMS) {
    const svg = garmentSvg(item);
    const absPath = path.join(OUT_DIR, item.file);
    fs.writeFileSync(absPath, svg, 'utf8');
    console.log('Wrote', path.relative(process.cwd(), absPath));
  }
}

main();
