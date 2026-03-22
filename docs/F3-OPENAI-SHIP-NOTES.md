# F3 + OpenAI — ship notes

- **Dashboard:** `fetchGenRef` prevents stale `/api/items` from overwriting items after “Load demo wardrobe”.
- **Env:** `backend/.env` loaded first, then repo-root `.env` (in `server.js`).
- **Demo:** `GET /api/demo/status` → `{ manifestExists }`.
- **Analyze:** OpenAI structured JSON (enums) → `normalizeMetadata`; fallback filename; flags `fromOpenAI` / `fromFilename`.
- **Outfits:** Up to 5 local candidates (top-K slots + `scoreOutfitCoherence`); optional `rerankOutfitCandidates` unless `OPENAI_OUTFIT_RERANK=0`.
- **API extras:** `reranked`, `candidateCount` on generate response (safe for older clients).
- **Playwright:** Ports `18080` / `13000` + `FRONTEND_ORIGIN` / `REACT_APP_PROXY_TARGET` — avoids proxying to a stale backend on `8080`.

See `OPENAI-F3-AUDIT-AND-PLAN.md` for the original audit and plan.
