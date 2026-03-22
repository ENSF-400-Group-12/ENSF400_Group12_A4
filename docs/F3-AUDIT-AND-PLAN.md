# F3 Outfit Recommendation Generation – Audit & Plan

## Audit (branch: feat/f3-outfit-generation)

### Generate Outfit page (`frontend/src/pages/GenerateOutfit.jsx`)
- **Exists:** Page with title, subtitle, and a card.
- **Current inputs:** Occasion (select: Casual, School, Work, Formal), Weather text input, “Use current weather” checkbox, Style checkboxes (More Formal, Layering, Neutral Colors). Generate button does nothing.
- **Missing:** No state for occasion/vibe; no style/vibe chips; weather and checkboxes should be removed per F3 (occasion + vibe only). Form not wired to any API or navigation.

### Results page (`frontend/src/pages/Results.jsx`)
- **Exists:** Static title “Outfit Recommendations” and one `<OutfitCard>` with hardcoded outfit `{ top, bottom, shoes, explanation }`.
- **Missing:** No real API data; no navigation state or route params; no regenerate flow; no empty/error states for insufficient wardrobe.

### OutfitCard (`frontend/src/components/OutfitCard.jsx`)
- **Exists:** Renders `outfit.top`, `outfit.bottom`, `outfit.shoes`, `outfit.explanation`.
- **Missing:** Not designed for full API shape (items array, occasion, vibe, optional outerwear); no images or links.

### Wardrobe metadata (backend)
- **On this branch:** No wardrobe backend. No `db/`, no `routes/items.js`, no `wardrobe_items` table.
- **Expected (from F2):** `wardrobe_items`: id, user_id, type, color, season, style, notes, image_path, created_at. Used for rule-based selection (top, bottom, shoes, optional outerwear).

### Backend structure
- **Exists:** `server.js` (Express, single GET “Yo”), `routes/index.js` (ES module, references missing `tasks`), `routes/wardrobe.js` (empty). No auth, no session, no DB, no `/api/items` or `/api/outfits`.
- **Missing:** DB connection and schema (users, wardrobe_items), auth routes and session, requireAuth middleware, GET/POST items (minimal for F3), POST `/api/outfits/generate`, and rule-based outfit generator service.

### Frontend API / auth
- **Exists:** None. No `config/api.js`, no `authFetch`, no AuthContext. Login/Signup only navigate locally.
- **Missing:** API base URL, credentialed fetch for protected routes, and login/signup calling backend so session exists for outfit generation.

---

## Implementation plan (4–5 chunks)

1. **Wire generate form and API usage**  
   Add `frontend/src/config/api.js` (API_BASE, authFetch). Update Generate page: occasion select + style/vibe chips only, no weather/checkboxes. On submit: POST `/api/outfits/generate` with `{ occasion, vibe }`, credentials included. On success, navigate to `/results` with response in location state. Optionally wire Login/Signup to auth API so session exists for testing.

2. **Protected outfit endpoint and rule-based generator**  
   Add backend: `db/connection.js` (users + wardrobe_items), `middleware/requireAuth.js`, `routes/auth.js`, minimal `routes/items.js` (GET list, GET by id, POST without file upload). Add `routes/outfits.js` with POST `/generate` (requireAuth, read body `occasion`/`vibe`, call generator). Add `services/outfitGenerator.js`: load user’s items from DB, score by type (top/bottom/shoes/outerwear), occasion and vibe, pick one per slot, build short explanation. Return `{ items, explanation, occasion, vibe }` or `{ error }` when wardrobe is insufficient.

3. **Outfit results page and regenerate**  
   Results page reads outfit from `location.state` (or shows error if missing). Render outfit summary, list of chosen items (with type, color, style, optional image), explanation block, and “Regenerate” CTA that goes back to `/generate` (or re-calls API and updates state). Reuse/adapt OutfitCard for the new shape.

4. **Insufficient-wardrobe and feedback**  
   When API returns error or “insufficient wardrobe”, show a clear message and CTA (e.g. “Add more items to your wardrobe” / “Try again”). Loading and error states on Generate page and Results page.

5. **Chore: generator and scoring**  
   Refactor generator: clear helpers for scoring by occasion/vibe, slot selection, and explanation building. Keep logic in one place and easy to demo.

---

## Commit plan

| # | Message | Scope |
|---|--------|--------|
| 1 | fix: wire generate outfit form to occasion and vibe payload | api.js, GenerateOutfit (occasion + vibe, submit → POST /api/outfits/generate, navigate to /results), optional login/signup API |
| 2 | feat: add protected outfit generation endpoint and rule-based generator | db, auth, requireAuth, items GET+POST minimal, outfits route, outfitGenerator service |
| 3 | feat: build outfit results page with explanation and regenerate flow | Results.jsx, OutfitCard or new layout; read state, show items + explanation, regenerate CTA |
| 4 | fix: improve insufficient-wardrobe states and generation feedback | Empty/error messaging, loading states |
| 5 | chore: clean recommendation helpers and item scoring structure | Refactor outfitGenerator scoring and explanation |

---

## Testing instructions (after implementation)

1. **Backend:** `cd backend && npm start`. DB initializes; server listens on http://localhost:8080.
2. **Frontend:** `cd frontend && npm start`. Set `REACT_APP_API_URL=http://localhost:8080` if needed (default is already 8080).
3. **Sign up / Log in:** Use Signup then Login so the session cookie is set (credentials: include).
4. **Add wardrobe items:** Use POST `/api/items` with JSON body `{ type, color, season, style, notes }` (e.g. type: "T-Shirt", color: "Black", season: "All", style: "Casual"). Add at least one top, one bottom, and one shoes type (e.g. Shirt, Jeans, Sneakers).
5. **Generate:** Go to Generate Outfit; select occasion and vibe; click Generate. You should be redirected to Results with outfit items and explanation.
6. **Regenerate:** On Results, click Regenerate to return to Generate and try again.
7. **Insufficient wardrobe:** With no items or only one slot filled, generate should show the error message and links to add items.

## Known gaps

- Add Item page may not call POST /api/items on this branch; use API (e.g. curl/Postman) or a minimal form to add items for testing. Dashboard may not load items from API.
- No F4 favorites or F5 weather; no external APIs or 3D.
- Generator uses type strings (e.g. "Shirt", "Jeans"); items with different type names may fall into "top" by default.
