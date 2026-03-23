# Demo clothing sources

These files are **source/reference** images for building the seeded demo wardrobe.

- **Runtime demo** (“Load demo wardrobe”) uses processed files under `../clothes-demo/` and `../clothes-demo-manifest.json`. Production backends also keep a copy under `backend/demo/` so Railway deploys work without the frontend folder.
- To regenerate webp assets, use `backend/scripts/normalize-clothes.js` (see repo docs).

Do not delete this folder if you want reproducible demo builds for the team.
