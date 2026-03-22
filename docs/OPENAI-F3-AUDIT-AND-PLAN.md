# Audit & implementation plan — OpenAI analysis + outfit reranking (F3)

## 1. Current state audit

### Item image analysis (`backend/services/imageAnalysis.js`)
- **Behavior:** Filename-only inference via `filenameInference.js`; returns `{}` when filename is unhelpful.
- **No vision model:** No `OPENAI_API_KEY` usage yet.
- **API:** `POST /api/items/analyze` (multer memory) → `analyzeItemImage(buffer, mimetype, originalname)`.
- **UX:** Add Item shows “Suggested from filename” / “suggested” badges; honest when empty.

### Outfit generation (`backend/services/outfitGenerator.js`)
- **Behavior:** Single outfit: best-scoring item per slot (`pickBestForSlot`), rule-based `scoreItem` for occasion/vibe; dress drops bottom.
- **No candidates / no LLM:** One deterministic pick; no color-coherence layer beyond vibe color hints.
- **API:** `POST /api/outfits/generate` → `{ items, explanation, occasion, vibe }` or `422` insufficient wardrobe.

### Demo wardrobe (`backend/routes/demo.js`)
- **Manifest:** `path.resolve(__dirname, '..', '..', 'frontend', 'public', 'clothes-demo-manifest.json')`.
- **Risk:** `dotenv.config()` with default path loads **cwd** `.env`. If dev runs `npm start` from `backend/` but keeps `.env` at **repo root**, `OPENAI_API_KEY` (and other vars) may be missing until path fix.

### Add item flow
- **Frontend:** `AddItem.jsx` — analyze on file select; maps API fields to dropdowns; filename vs detected copy.
- **Stable:** Works without AI; needs extension for `fromOpenAI` / analysis source.

### Browser / automation
- **Playwright:** Not present in repo; CRA + manual proxy to backend.
- **Docs:** `DEMO-VALIDATION.md` — some checklist items still manual (insufficient wardrobe, edit/delete).

---

## 2. Implementation approach

| Area | Approach |
|------|-----------|
| **Vision** | OpenAI Chat Completions `gpt-4o-mini` (from `OPENAI_MODEL`) with `image_url` (base64 data URL) + **Structured Outputs** (`json_schema`) for `type`, `color`, `season`, `style` constrained to app enums. |
| **Fallback** | On missing key, timeout, or API error → existing filename inference → `{}`. |
| **Candidates** | Per slot: top-K by existing `scoreItem`; enumerate outfits (dress handling); cap combinations; score with **local rubric** (color harmony, clash penalties). |
| **Rerank** | Optional second call: compact list of candidate summaries + occasion + vibe + short rubric text → `{ chosen_index, explanation }`. On failure: best local candidate + template explanation. |
| **No replacement** | Core selection remains rule-based; LLM only reranks pre-built candidates and rewrites explanation. |

**Env:** `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o-mini`, optional `OPENAI_OUTFIT_RERANK=1` (default on when key present, or always attempt rerank and fallback).

I'll use: rerank when key exists; `OPENAI_OUTFIT_RERANK=0` to disable.

---

## 3. Exact commit plan (before coding)

1. **fix:** repair demo wardrobe loading and browser flow stability — load `.env` from repo root + `backend/`; optional `GET /api/demo/status` for manifest presence.
2. **feat:** add OpenAI-backed clothing image analysis with structured output — `openai` dep, `services/openaiItemAnalysis.js`, wire `imageAnalysis.js` try OpenAI then filename.
3. **fix:** normalize AI item metadata and improve add item suggestion UX — ensure `normalizeMetadata`; API flags `fromOpenAI` / `analysisSource`; frontend copy for AI vs filename.
4. **feat:** add outfit candidate generation + optional OpenAI reranking and richer explanation — `lib/styleRubric.js`, candidate builder, `outfitRerank` service, extend `generateOutfit` + response shape if needed (`reranked: boolean`).
5. **fix:** improve style coherence and color matching in local scoring — extend rubric (formal/sport clash, neutrals, occasion-color rules).
6. **chore:** add Playwright e2e for F1/F2/F3 flows + doc how to run (servers must be up or use `webServer` in config).

---

## 4. Post-implementation

- **Manual retest:** Login, load demo, add item with/without API key, generate outfit, insufficient wardrobe, results explanation.
- **Fallback:** No key or API errors → filename → empty analyze; outfit → local best candidate + rule explanation.
- **Deferred:** Favorites; full CI wiring for Playwright in cloud without secrets.
