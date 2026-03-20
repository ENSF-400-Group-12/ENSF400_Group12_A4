# Repair Audit: Demo Flow & Add Item

## 1. Image analysis (bad results)

**Root cause:** Pure stub in `backend/services/imageAnalysis.js` — always returns `{ type: 'Shirt', color: 'Blue', season: 'All Season', style: 'Casual' }` regardless of the uploaded image. No inspection of the image or filename.

**Impact:** Black Jordans → Shirt / Blue / Casual. Product feels fake.

**Fix:** Add filename-based inference (reuse logic from `normalize-clothes.js`). Pass `req.file.originalname` from the analyze endpoint. When filename suggests type/color (e.g. `black_jays.jpg` → Sneakers, Black), use that. When unknown, return `{}` and show "Add details below" — do not fake confident wrong answers.

---

## 2. Demo wardrobe seed failure

**Possible causes:**
- Manifest path: `path.join(__dirname, '../../frontend/public/clothes-demo-manifest.json')` — `__dirname` is `backend/routes`, so path = project_root/frontend/public/clothes-demo-manifest.json. File exists.
- Session/auth: User may not be logged in (401 → "Not authenticated").
- DB/schema: wardrobe_items columns match insert. Unlikely.
- Path resolution: On some setups (e.g. different cwd, Windows), path could differ. Use `path.resolve` for robustness.
- Error swallowed: Backend returns generic "Failed to seed demo wardrobe." — actual error (e.g. manifest not found, DB error) is not surfaced.

**Fix:**
1. Use `path.resolve(__dirname, '..', '..', 'frontend', 'public', 'clothes-demo-manifest.json')` for robust path.
2. Improve error responses: return specific message (manifest not found vs DB error).
3. Frontend: if 401, show "Please log in first" and optionally redirect to login.
4. Add server-side logging for 500s to aid diagnosis.

---

## 3. Dashboard CTA redundancy

**Root cause:** Two separate "Add Item" entry points when wardrobe is empty:
1. `dashboard-actions` section: always shows an "Add Item" action card (link to /add-item).
2. `dashboard-empty` section: when filtered results are empty and no filters, shows "Add Item" button + "Load demo wardrobe".

**Impact:** User sees both an Add Item card and an empty state with another Add Item button. Redundant and messy.

**Fix:** When wardrobe is truly empty (no filters), hide the actions bar or show only "Generate Outfit" (disabled/grayed with tooltip) and "Load demo wardrobe". Let the empty state be the primary CTA: "Load demo wardrobe" + "Add your first item". Or: when empty, show a single unified empty state (no separate action cards row) with Load demo + Add Item as the only actions.

**Chosen approach:** When `items.length === 0`, hide the `dashboard-actions` cards row. Show only the empty state with "Load demo wardrobe" and "Add Item". When `items.length > 0`, show the actions bar as normal.

---

## 4. Add Item button misalignment

**Root cause:** 
- `additem-actions` uses `flex` with `flex-wrap`, `justify-content: flex-end`, `align-items: center`.
- Cancel (button-secondary) and Save (button-primary additem-button) are direct children.
- `additem-button` has `margin-top: 18px` — this pulls the Save button down.
- Optional `additem-all-set-hint` span can wrap and push layout.
- The `additem-actions-buttons` class exists in CSS but is NOT used in AddItem.jsx — the buttons are not wrapped, so they don't get the aligned `height: 46px` treatment.

**Fix:** 
1. Wrap Cancel and Save in a div with `additem-actions-buttons` (or equivalent) so both get consistent height and alignment.
2. Remove `margin-top` from additem-button when inside the button row.
3. Put the hint below the buttons (or in a separate row) so it doesn't affect alignment.

---

## Implementation plan

1. **fix: repair demo wardrobe seed flow and dashboard CTA redundancy**
   - Demo: resolve manifest path, better error messages, 401 handling in frontend
   - Dashboard: when `items.length === 0`, hide actions bar; empty state is primary CTA

2. **fix: improve add item analysis suggestions and fallback behavior**
   - Add filename-based inference to imageAnalysis (extract logic from normalize-clothes)
   - Pass originalname from analyze endpoint
   - When no inference possible, return `{}` — UI already shows "Add details below" for analysisFailed
   - Soften "We detected" copy to "Suggested from filename:" when from filename

3. **fix: align add item actions and polish affected UI spacing**
   - Wrap Cancel/Save in button row with consistent alignment
   - Remove/add margin as needed
   - Ensure hint doesn't break alignment
