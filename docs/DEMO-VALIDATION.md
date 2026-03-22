# Demo Validation Report

## Normalized Assets

- **Source:** `frontend/public/clothes/`
- **Output:** `frontend/public/clothes-demo/` (WEBP, 800px max)
- **Valid normalized:** 25 files
- **Ignored:** 1 file — `brown_sweat_pants.png!w700wp` (invalid extension)

## Demo Workflow

1. **Normalize assets:** `cd backend && npm run normalize-clothes`
2. **Optional CLI seed:** `cd backend && npm run seed-demo` (creates demo@closetai.local / demodemo123)
3. **In-app seed:** Login, go to empty dashboard, click "Load demo wardrobe"

## E2E Validation Checklist

- [x] Login / Signup
- [x] Load demo wardrobe (empty state) — button available when wardrobe empty
- [x] Dashboard shows items
- [x] Item images display in grid (when image_path set)
- [x] Generate outfit (occasion + vibe)
- [x] Results page shows outfit with item grid (images when image_path set)
- [x] Regenerate flow
- [ ] Insufficient wardrobe state — tested manually
- [ ] Edit / Delete item — tested in prior session

## Favorites

- **Status:** Placeholder only ("Coming soon")
- **Nav:** No link in navbar
- **Action:** Deferred; no fake implementation
