# Browser fix audit (manual testing)

## 1. Load demo wardrobe

**Likely causes:**
- **Manifest path:** `path.resolve(__dirname, …/frontend/public/…)` fails when the API process cwd/repo layout differs (e.g. only `build/` deployed, or server started outside repo root).
- **POST body:** `authFetch` sets `Content-Type: application/json` but demo seed used **no body**; some stacks mishandle empty JSON bodies with `express.json()`.
- **Stale backend on 8080:** Proxy can hit another process (fixed in e2e earlier; dev machines can still see `Cannot POST /api/demo/seed`).

**Fix:** Multi-candidate manifest resolution + optional copy under `backend/data/` from `normalize-clothes` + dashboard `POST` with `body: JSON.stringify({})`.

## 2. Shirt / Blue / All Season / Casual

**Not the old code stub** in tree; sources are:
- **OpenAI:** Schema forces a full enum pick; prompt allowed “guess” → model outputs generic **Shirt + Blue + Casual** on weak photos.
- **Filename:** `inferFromFilename` **always** returned metadata: default **T‑Shirt + Black** when no pattern matched (camera filenames → wrong “generic” suggestions). Broad `/shirt/` substring matches many bases.

**Fix:** OpenAI **`confidence` high | low** — apply metadata only if **high**. Filename only when **type signal** is strong (override or pattern match); **no** default type/color. Tighter shirt pattern (token-based, not bare `shirt` everywhere).

## 3. Outfit generator too permissive

- **Outerwear:** Cartesian product `outerChoices = [null, …]` often adds a 4th piece whenever jackets exist.
- **No “unsuitable” gate:** Any filled top/bottom/shoes passed, even when scores are poor for Formal/Classy etc.
- **Same outfit:** Deterministic sort → identical pick with small wardrobes.

**Fix:** Build **core** outfits (top, bottom, shoes) only; add outerwear **only** if score gain and occasion/vibe warrant it. **Minimum score** vs occasion+vibe; **NOT_SUITABLE** error. **Jitter** among near-tie candidates.

## 4. Generate page cramped

**Cause:** `.generate-field { gap: 6px }`, stacked label + default first option + separate hint line with small margins.

**Fix:** Larger gaps, section spacing, optional `aria-label` on select; calmer hierarchy in CSS.

## Commit plan

1. `fix: repair demo wardrobe seed flow for real browser use`
2. `fix: make item analysis use real AI output or no suggestion at all`
3. `fix: improve metadata confidence handling and filename fallback logic`
4. `fix: make outfit generator more selective and reduce forced weak combinations`
5. `fix: improve insufficient-wardrobe handling for occasion and vibe requests`
6. `fix: polish generate page spacing and hierarchy`
