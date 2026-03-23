# Demo wardrobe bundle

This folder is **shipped with the backend** so “Load demo wardrobe” works on Railway and other hosts where `frontend/public` is not present.

- `clothes-demo-manifest.json` — item metadata and `imagePath` values like `/clothes-demo/*.webp`
- `clothes-demo/` — normalized WebP images (same paths as the manifest)

Regenerate from source assets (team laptops / CI):

```bash
cd backend && npm run normalize-clothes
```

Optional override: set `DEMO_MANIFEST_PATH` to an absolute path if you host the manifest elsewhere.
