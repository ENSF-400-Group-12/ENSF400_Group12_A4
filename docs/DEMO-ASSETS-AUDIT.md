# Demo Assets and App Audit

## 1. Current App State

- **Branch:** integration/f3-synthetic
- **Stack:** React 19 + Express 5 + sql.js, CRA with setupProxy
- **Auth:** Session-based (cookie), F1 login/signup
- **Wardrobe:** F2 CRUD, image upload to `/uploads/`
- **Outfit generation:** F3 rule-based, occasion + vibe
- **Image paths:** `image_path` in DB; `/uploads/xxx` served by backend; frontend uses `apiUrl(path)` which proxies `/uploads` to backend

## 2. Asset Folder (frontend/public/clothes)

| File | Valid | Format | Inferred metadata |
|------|-------|--------|-------------------|
| adidas_brown.webp | ✓ | webp | Sneakers, Brown, Sport |
| adidas_campus.jpg | ✓ | jpg | Sneakers, varies, Sport |
| black_blazer.webp | ✓ | webp | Blazer, Black, Formal |
| black_casual_shoes.jpg | ✓ | jpg | Shoes, Black, Casual |
| black_hoodie.jpg | ✓ | jpg | Hoodie, Black, Casual |
| black_pants.avif | ✓ | avif | Pants, Black, Casual |
| black_striped_pants.jpg | ✓ | jpg | Pants, Black, Casual |
| black_sweat_pants.jpg | ✓ | jpg | Pants, Black, Casual |
| black_zip_up.webp | ✓ | webp | Hoodie, Black, Casual |
| brown_sweat_pants.png!w700wp | ✗ | junk | — |
| button_up_half_sleeve_navy.avif | ✓ | avif | Shirt, Navy, Casual |
| cream_blazer.avif | ✓ | avif | Blazer, Cream, Formal |
| formal_black.webp | ✓ | webp | Shoes, Black, Formal |
| formal_brown.webp | ✓ | webp | Shoes, Brown, Formal |
| green_hoodie.webp | ✓ | webp | Hoodie, Green, Casual |
| green_sweat_pants.jpg | ✓ | jpg | Pants, Green, Casual |
| grey_zip_up.avif | ✓ | avif | Hoodie, Gray, Casual |
| jeans.webp | ✓ | webp | Jeans, (color TBD) |
| jean_jacket.jpg | ✓ | jpg | Jacket, (denim) |
| jean_shorts.webp | ✓ | webp | Shorts, (denim) |
| navy_blazer.webp | ✓ | webp | Blazer, Navy, Formal |
| navy_pants.avif | ✓ | avif | Pants, Navy, Casual |
| red_jays.jpg | ✓ | jpg | Sneakers, Red, Sport |
| white_button_up.webp | ✓ | webp | Shirt, White, Casual |
| white_hoodie.webp | ✓ | webp | Hoodie, White, Casual |
| white_jays.webp | ✓ | webp | Sneakers, White, Sport |
| white_tee.jpg | ✓ | jpg | T-Shirt, White, Casual |

**Invalid:** 1 file — `brown_sweat_pants.png!w700wp` (malformed extension, mistaken download).

**No HTML or other non-image files** in the folder.

## 3. UI/UX Gaps

- **OutfitCard:** Does not display item images; only text (type, color, style).
- **Results page:** No visual representation of outfit items.
- **Dashboard:** Images work for `/uploads/` paths; need to support `/clothes-demo/` for static demo assets.
- **Filter bar:** Four dropdowns can feel dense on mobile; acceptable for demo.

## 4. Generator Quality

- **Slot mapping:** `slotForType()` maps types to top/bottom/shoes/outerwear. "Zip up" and "Sweat Pants" map via Pants/Hoodie.
- **Occasion scoring:** Work, Date Night, Outdoor present; School and Weekend scoring could be clearer.
- **Vibe overlap:** Formal in both Occasion and Vibe is intentional (context vs. style).
- **Style matching:** VIBE_STYLE_KEYWORDS and color hints exist; can be refined.

## 5. Favorites / Save Outfit

- **Favorites page:** Placeholder only — "Save and revisit your favorite outfit combinations. This feature is coming soon."
- **Navbar:** No link to Favorites; route exists at `/favorites` but is not exposed.
- **Decision:** Keep route for future use; do not add nav link. No fake implementation.

## 6. Commit Plan

| # | Commit | Files |
|---|--------|-------|
| 1 | chore: normalize local demo clothing assets and add import metadata mapping | scripts/normalize-clothes.js, clothes-demo-manifest.json, frontend/package.json |
| 2 | feat: improve wardrobe and results image handling for demo assets | OutfitCard.jsx, api.js (if needed), scripts/seed-demo.js |
| 3 | fix: improve outfit generator matching and vibe normalization | outfitGenerator.js |
| 4 | fix: polish dashboard, add-item, and results UI for demo flow | main.css, OutfitCard, Results |
| 5 | fix: reduce redundant options and clarify user flow | GenerateOutfit, Favorites (optional) |
| 6 | chore: run end-to-end demo validation with local clothing assets | DEMO-VALIDATION.md |

## 7. Implementation Plan (6 chunks)

1. **chore: normalize local demo clothing assets and add import metadata mapping**
   - Dev script to convert valid images to WEBP
   - Output to `frontend/public/clothes-demo/`
   - Manifest JSON with inferred metadata and overrides for ambiguous files
   - Ignore invalid files

2. **feat: improve wardrobe and results image handling for demo assets**
   - OutfitCard: display item images when `image_path` exists
   - Ensure `apiUrl`/img src works for both `/uploads/` and `/clothes-demo/`
   - Demo seed script to populate DB from manifest (creates demo user + items)

3. **fix: improve outfit generator matching and vibe normalization**
   - Add School, Weekend to occasion scoring
   - Broaden slot/type recognition if needed

4. **fix: polish dashboard, add-item, and results UI for demo flow**
   - OutfitCard layout with thumbnails
   - Spacing and hierarchy polish

5. **fix: reduce redundant options and clarify user flow**
   - Audit occasions/vibes; no nav link for Favorites

6. **chore: run end-to-end demo validation with local clothing assets**
   - Browser E2E: seed, login, dashboard, generate, results
   - Document results
