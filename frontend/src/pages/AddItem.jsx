// Add or edit a clothing item: photo-first, low-friction

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch, apiUrl } from "../config/api";

const clothingTypes = [
  "Shirt", "T-Shirt", "Hoodie", "Sweater", "Jacket", "Coat", "Blazer",
  "Pants", "Jeans", "Shorts", "Skirt", "Dress", "Shoes", "Boots", "Sneakers", "Sandals",
  "Hat", "Accessories"
];
const colors = [
  "Black", "White", "Gray", "Brown", "Beige", "Navy", "Blue", "Light Blue",
  "Red", "Burgundy", "Green", "Olive", "Yellow", "Orange", "Purple", "Pink", "Cream"
];
const seasons = ["Spring", "Summer", "Fall", "Winter", "All Season"];
const styles = [
  "Casual", "Formal", "Business", "Streetwear", "Sport", "Athletic",
  "Minimalist", "Vintage", "Smart Casual"
];

/** Map API/fuzzy value to an allowed option (case-insensitive, contains). */
function formatGarmentProfileSummary(p) {
  if (!p || typeof p !== "object") return "";
  const parts = [];
  if (p.subtype) parts.push(String(p.subtype).replace(/_/g, " "));
  if (p.formality) parts.push(`formality ${p.formality}`);
  if (p.layerRole) parts.push(`layer ${p.layerRole}`);
  if (p.materialVibe) parts.push(p.materialVibe);
  if (p.versatility) parts.push(String(p.versatility).replace(/_/g, " "));
  return parts.join(" · ");
}

function mapToOption(value, options) {
  if (!value || !options || !options.length) return null;
  const v = String(value).trim().toLowerCase();
  if (!v) return null;
  const exact = options.find((o) => o.trim().toLowerCase() === v);
  if (exact) return exact;
  const contains = options.find((o) => o.toLowerCase().includes(v) || v.includes(o.toLowerCase()));
  return contains || null;
}

function AddItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const isEdit = Boolean(id);

  const [type, setType] = useState("");
  const [color, setColor] = useState("");
  const [season, setSeason] = useState("");
  const [style, setStyle] = useState("");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  /** Resolved URL for saved image on edit (no new file chosen). */
  const [existingServerImageUrl, setExistingServerImageUrl] = useState(null);
  const [duplicateWarn, setDuplicateWarn] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [prefilledByAi, setPrefilledByAi] = useState({ type: false, color: false, season: false, style: false });
  const [fromFilename, setFromFilename] = useState(false);
  const [fromOpenAI, setFromOpenAI] = useState(false);
  const [analysisUncertain, setAnalysisUncertain] = useState(false);
  /** false = server reports no OPENAI_API_KEY (vision off). null = unknown. */
  const [openaiConfigured, setOpenaiConfigured] = useState(null);
  /** Rich signals from analysis (stored in DB, not shown as separate form fields). */
  const [garmentProfile, setGarmentProfile] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/items/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) setLoadError(data.error || "Failed to load item.");
          return;
        }
        const data = await res.json();
        if (!cancelled && data.item) {
          setType(data.item.type || "");
          setColor(data.item.color || "");
          setSeason(data.item.season || "");
          setStyle(data.item.style || "");
          setNotes(data.item.notes || "");
          const gp = data.item.garmentProfile;
          setGarmentProfile(gp && typeof gp === "object" && Object.keys(gp).length ? gp : null);
          const ip = data.item.image_path;
          setExistingServerImageUrl(ip ? apiUrl(ip) : null);
        }
      } catch (e) {
        if (!cancelled) setLoadError("Failed to load item.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (imageFile || isEdit) return;
    setAnalyzing(false);
    setAnalysisDone(false);
    setAnalysisFailed(false);
    setPrefilledByAi({ type: false, color: false, season: false, style: false });
    setFromFilename(false);
    setFromOpenAI(false);
    setAnalysisUncertain(false);
    setOpenaiConfigured(null);
    setGarmentProfile(null);
  }, [imageFile, isEdit]);

  useEffect(() => {
    if (!imageFile || isEdit) return;
    let cancelled = false;
    (async () => {
      setAnalyzing(true);
      try {
        const form = new FormData();
        form.append("image", imageFile);
        const res = await authFetch("/api/items/analyze", { method: "POST", body: form });
        if (cancelled) return;
        if (!res.ok && !cancelled) setAnalysisFailed(true);
        if (res.ok) {
          const data = await res.json();
          const src = data.suggestionSource
            || (data.fromOpenAI ? 'ai' : data.fromFilename ? 'filename' : 'none');
          const t = mapToOption(data.type, clothingTypes);
          const c = mapToOption(data.color, colors);
          const s = mapToOption(data.season, seasons);
          const st = mapToOption(data.style, styles);
          const nextPrefilled = { type: false, color: false, season: false, style: false };
          if (t) { setType(t); nextPrefilled.type = true; }
          if (c) { setColor(c); nextPrefilled.color = true; }
          if (s) { setSeason(s); nextPrefilled.season = true; }
          if (st) { setStyle(st); nextPrefilled.style = true; }
          const anyFilled = Boolean(t || c || s || st);
          if (!cancelled) {
            setPrefilledByAi(nextPrefilled);
            setFromOpenAI(src === 'ai');
            setFromFilename(src === 'filename');
            setAnalysisUncertain((src === 'none' || Boolean(data.uncertain)) && !anyFilled);
            if (typeof data.openaiConfigured === 'boolean') {
              setOpenaiConfigured(data.openaiConfigured);
            } else {
              setOpenaiConfigured(null);
            }
            if (data.garmentProfile && typeof data.garmentProfile === "object" && Object.keys(data.garmentProfile).length) {
              setGarmentProfile(data.garmentProfile);
            }
          }
        }
      } catch (_) {
        if (!cancelled) setAnalysisFailed(true);
      } finally {
        if (!cancelled) {
          setAnalyzing(false);
          setAnalysisDone(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [imageFile, isEdit]);

  const validate = () => {
    const err = {};
    if (!type.trim()) err.type = "Please choose a type.";
    if (!color.trim()) err.color = "Please choose a color.";
    if (!season.trim()) err.season = "Please choose a season.";
    if (!style.trim()) err.style = "Please choose a style.";
    setFieldErrors(err);
    if (Object.keys(err).length > 0) {
      setTimeout(() => {
        const first = document.getElementById("additem-type") || document.getElementById("additem-color") || document.getElementById("additem-season") || document.getElementById("additem-style");
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return false;
    }
    return true;
  };

  const missingCount = [type, color, season, style].filter((v) => !v || !String(v).trim()).length;
  const allFilled = missingCount === 0;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
  };

  const handleSubmit = async (e, opts = {}) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!opts.duplicateOverride) setDuplicateWarn(null);
    if (!validate()) return;

    setSubmitLoading(true);
    try {
      if (isEdit) {
        const res = await authFetch(`/api/items/${id}`, {
          method: "PUT",
          body: JSON.stringify({ type: type.trim(), color: color.trim(), season: season.trim(), style: style.trim(), notes: notes.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Update failed.");
          setSubmitLoading(false);
          return;
        }
        if (imageFile) {
          const form = new FormData();
          form.append("image", imageFile);
          const resImg = await authFetch(`/api/items/${id}/image`, { method: "POST", body: form });
          if (!resImg.ok) {
            const data = await resImg.json().catch(() => ({}));
            setError(data.error || "Image update failed.");
            setSubmitLoading(false);
            return;
          }
        }
        setDuplicateWarn(null);
        navigate("/dashboard");
        return;
      }

      const form = new FormData();
      form.append("type", type.trim());
      form.append("color", color.trim());
      form.append("season", season.trim());
      form.append("style", style.trim());
      form.append("notes", notes.trim());
      form.append("garmentProfile", JSON.stringify(garmentProfile && Object.keys(garmentProfile).length ? garmentProfile : {}));
      if (imageFile) form.append("image", imageFile);
      if (opts.duplicateOverride) form.append("duplicateOverride", "1");

      const res = await authFetch("/api/items", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDuplicateWarn(null);
        navigate("/dashboard");
        return;
      }
      if (res.status === 409 && data.code === "DUPLICATE_ITEM") {
        setDuplicateWarn(data);
        setSubmitLoading(false);
        return;
      }
      const msg = res.status === 401 ? "Session expired. Please log in again." : (data.error || "Save failed.");
      setError(msg);
      setSubmitLoading(false);
      return;
    } catch (err) {
      const msg = err.name === "TypeError" && (err.message === "Failed to fetch" || err.message?.includes("fetch"))
        ? "Could not reach the server. Start the backend and try again."
        : (err.message || "Something went wrong. Please try again.");
      setError(msg);
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="additem-page">
        <div className="additem-card">
          <p className="additem-subtext">Loading...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="additem-page">
        <div className="additem-card">
          <p className="additem-error">{loadError}</p>
          <button type="button" className="button-primary" onClick={() => navigate("/dashboard")}>Back to Wardrobe</button>
        </div>
      </div>
    );
  }

  return (
    <div className="additem-page">
      <div className="additem-card additem-card--wide">
        <h1 className="additem-title">{isEdit ? "Edit Item" : "Add Item"}</h1>
        <p className="additem-subtext">
          {isEdit
            ? "Update the photo or details below."
            : "Add a photo: we suggest details from the image (when AI is enabled) or from the filename. Always confirm or edit before saving."}
        </p>

        <form onSubmit={handleSubmit} className="additem-form">
          {/* Photo-first upload zone */}
          <div className="additem-upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="additem-file-input"
              onChange={handleFileChange}
              aria-label="Choose item photo"
            />
            {isEdit || previewUrl ? (
              <div className="additem-preview-wrap">
                <div className="additem-preview-box">
                  {previewUrl ? (
                    <img src={previewUrl} alt={isEdit ? "New photo preview" : "Preview"} className="additem-preview-img" />
                  ) : existingServerImageUrl ? (
                    <img src={existingServerImageUrl} alt="Saved wardrobe item" className="additem-preview-img" />
                  ) : (
                    <span className="additem-preview-placeholder">
                      {isEdit ? "No photo on file yet. Choose a photo to add one." : "No image selected"}
                    </span>
                  )}
                </div>
                {analyzing && !isEdit && (
                  <p className="additem-analyzing" aria-live="polite">Analyzing item…</p>
                )}
                {analysisFailed && !isEdit && !analyzing && (
                  <p className="additem-fallback-msg" role="status">
                    We couldn’t analyze this photo. Add the details below and save.
                  </p>
                )}
                {analysisDone && analysisUncertain && !isEdit && !analyzing && (
                  <p className="additem-fallback-msg" role="status">
                    We couldn’t confidently identify this item. Please confirm the details below.
                  </p>
                )}
                {analysisDone && openaiConfigured === false && !isEdit && !analyzing && (
                  <p className="additem-fallback-msg additem-fallback-msg--warn" role="status">
                    Photo analysis is off: the server has no API key loaded. Put <code className="additem-code">OPENAI_API_KEY</code> in a UTF-8 <code className="additem-code">.env</code> at the repo root, restart the backend on the same port as the dev proxy (default 8080), then try again.
                  </p>
                )}
                <button
                  type="button"
                  className="additem-change-photo"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? "Change photo" : "Choose photo"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="additem-upload-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="additem-upload-icon" aria-hidden>📷</span>
                <span className="additem-upload-text">Tap to add a photo</span>
                <span className="additem-upload-hint">JPEG, PNG, GIF or WebP · max 5MB</span>
              </button>
            )}
          </div>

          {/* Confirm or edit (AI suggestions) */}
          <div className="additem-metadata">
            {analysisDone && (prefilledByAi.type || prefilledByAi.color || prefilledByAi.season || prefilledByAi.style) && (
              <p className="additem-detected-summary" role="status">
                {fromOpenAI ? "AI suggestion (vision): " : fromFilename ? "Filename suggestion: " : "Suggestions: "}
                {[prefilledByAi.type && type, prefilledByAi.color && color, prefilledByAi.season && season, prefilledByAi.style && style].filter(Boolean).join(" · ") || "none yet"}
              </p>
            )}
            {garmentProfile && Object.keys(garmentProfile).length > 0 && (
              <details className="additem-profile-details">
                <summary>Style signals saved with this item</summary>
                <p className="additem-profile-line">{formatGarmentProfileSummary(garmentProfile)}</p>
                <p className="additem-profile-hint">Used for outfit matching. Your dropdowns above are still what you confirm.</p>
              </details>
            )}
            <h2 className="additem-metadata-heading">Confirm or edit</h2>
            <p className="additem-metadata-hint">Change any field if we got it wrong. Fill only what’s missing.</p>
            <div className="additem-metadata-grid">
              <div className={`additem-field ${!type.trim() && analysisDone ? "additem-field--needs-value" : ""}`}>
                <label htmlFor="additem-type">Type {prefilledByAi.type && type && <span className="additem-badge">{fromOpenAI ? "AI" : fromFilename ? "file" : "filled"}</span>}</label>
                <select id="additem-type" className="additem-input" value={type} onChange={(e) => { setType(e.target.value); setPrefilledByAi((p) => ({ ...p, type: false })); }}>
                  <option value="">Select type</option>
                  {clothingTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {fieldErrors.type && <span className="additem-inline-error">{fieldErrors.type}</span>}
              </div>
              <div className={`additem-field ${!color.trim() && analysisDone ? "additem-field--needs-value" : ""}`}>
                <label htmlFor="additem-color">Color {prefilledByAi.color && color && <span className="additem-badge">{fromOpenAI ? "AI" : fromFilename ? "file" : "filled"}</span>}</label>
                <select id="additem-color" className="additem-input" value={color} onChange={(e) => { setColor(e.target.value); setPrefilledByAi((p) => ({ ...p, color: false })); }}>
                  <option value="">Select color</option>
                  {colors.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {fieldErrors.color && <span className="additem-inline-error">{fieldErrors.color}</span>}
              </div>
              <div className={`additem-field ${!season.trim() && analysisDone ? "additem-field--needs-value" : ""}`}>
                <label htmlFor="additem-season">Season {prefilledByAi.season && season && <span className="additem-badge">{fromOpenAI ? "AI" : fromFilename ? "file" : "filled"}</span>}</label>
                <select id="additem-season" className="additem-input" value={season} onChange={(e) => { setSeason(e.target.value); setPrefilledByAi((p) => ({ ...p, season: false })); }}>
                  <option value="">Select season</option>
                  {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {fieldErrors.season && <span className="additem-inline-error">{fieldErrors.season}</span>}
              </div>
              <div className={`additem-field ${!style.trim() && analysisDone ? "additem-field--needs-value" : ""}`}>
                <label htmlFor="additem-style">Style {prefilledByAi.style && style && <span className="additem-badge">{fromOpenAI ? "AI" : fromFilename ? "file" : "filled"}</span>}</label>
                <select id="additem-style" className="additem-input" value={style} onChange={(e) => { setStyle(e.target.value); setPrefilledByAi((p) => ({ ...p, style: false })); }}>
                  <option value="">Select style</option>
                  {styles.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {fieldErrors.style && <span className="additem-inline-error">{fieldErrors.style}</span>}
              </div>
            </div>
            <div className="additem-field additem-field--full">
              <label htmlFor="additem-notes">Notes (optional)</label>
              <textarea
                id="additem-notes"
                placeholder="Brand, fit, warmth…"
                className="additem-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {Object.keys(fieldErrors).length > 0 && (
            <p className="additem-validation-summary" role="alert">
              Please fill in the missing fields below, then you can save.
            </p>
          )}
          {duplicateWarn && !isEdit && (
            <div className="additem-dup-panel" role="region" aria-label="Possible duplicate wardrobe items">
              <h2 className="additem-dup-title">
                {(duplicateWarn.duplicateLevel === "exact" || duplicateWarn.duplicateLevel === "both")
                  ? "Strong match: this photo is already saved in your wardrobe."
                  : "Possible duplicate: same type, color, and style as an item you have."}
              </h2>
              <p className="additem-dup-lead">
                {duplicateWarn.message || "Compare the thumbnail and details. If this is a different piece, you can still save it."}
              </p>
              {(duplicateWarn.exact?.length > 0) && (
                <div className="additem-dup-group">
                  <h3 className="additem-dup-group-title">Same image</h3>
                  <div className="additem-dup-grid">
                    {duplicateWarn.exact.map((it) => (
                      <article key={it.id} className="additem-dup-card">
                        <div className="additem-dup-thumb-wrap">
                          {it.image_path ? (
                            <img src={apiUrl(it.image_path)} alt="" className="additem-dup-thumb" />
                          ) : (
                            <span className="additem-dup-thumb additem-dup-thumb--empty">No photo</span>
                          )}
                        </div>
                        <div className="additem-dup-meta">
                          <span className="additem-dup-type">{it.type}</span>
                          <span className="additem-dup-detail">{it.color} · {it.style}</span>
                        </div>
                        <button
                          type="button"
                          className="button-secondary additem-dup-use"
                          onClick={() => navigate(`/edit-item/${it.id}`)}
                        >
                          Use this item
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              )}
              {(duplicateWarn.similar?.length > 0) && (
                <div className="additem-dup-group">
                  <h3 className="additem-dup-group-title">Very similar details</h3>
                  <div className="additem-dup-grid">
                    {duplicateWarn.similar.map((it) => (
                      <article key={it.id} className="additem-dup-card">
                        <div className="additem-dup-thumb-wrap">
                          {it.image_path ? (
                            <img src={apiUrl(it.image_path)} alt="" className="additem-dup-thumb" />
                          ) : (
                            <span className="additem-dup-thumb additem-dup-thumb--empty">No photo</span>
                          )}
                        </div>
                        <div className="additem-dup-meta">
                          <span className="additem-dup-type">{it.type}</span>
                          <span className="additem-dup-detail">{it.color} · {it.style}</span>
                        </div>
                        <button
                          type="button"
                          className="button-secondary additem-dup-use"
                          onClick={() => navigate(`/edit-item/${it.id}`)}
                        >
                          Open this item
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              )}
              <div className="additem-dup-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setDuplicateWarn(null)}
                >
                  Go back
                </button>
                <button
                  type="button"
                  className="button-primary"
                  disabled={submitLoading}
                  onClick={(ev) => handleSubmit(ev, { duplicateOverride: true })}
                >
                  {submitLoading ? "Saving…" : "Save anyway"}
                </button>
              </div>
            </div>
          )}
          {error && <p className="additem-inline-error additem-error-block" role="alert">{error}</p>}
          <div className="additem-actions">
            <div className="additem-actions-buttons">
              <button type="button" className="button-secondary" onClick={() => navigate("/dashboard")}>
                Cancel
              </button>
              <button type="submit" className="button-primary" disabled={submitLoading}>
                {submitLoading ? "Saving…" : isEdit ? "Update Item" : "Save Item"}
              </button>
            </div>
            {!isEdit && allFilled && !submitLoading && (
              <span className="additem-all-set-hint">All set? Save to add this item to your wardrobe.</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddItem;
