// Add or edit a clothing item

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../config/api";

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

function AddItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [type, setType] = useState("");
  const [color, setColor] = useState("");
  const [season, setSeason] = useState("");
  const [style, setStyle] = useState("");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState(null);
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
        }
      } catch (e) {
        if (!cancelled) setLoadError("Failed to load item.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const validate = () => {
    const err = {};
    if (!type.trim()) err.type = "Type is required.";
    if (!color.trim()) err.color = "Color is required.";
    if (!season.trim()) err.season = "Season is required.";
    if (!style.trim()) err.style = "Style is required.";
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
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
        navigate("/dashboard");
        return;
      }

      const form = new FormData();
      form.append("type", type.trim());
      form.append("color", color.trim());
      form.append("season", season.trim());
      form.append("style", style.trim());
      form.append("notes", notes.trim());
      if (imageFile) form.append("image", imageFile);

      const res = await authFetch("/api/items", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = res.status === 401 ? "Session expired. Please log in again." : (data.error || "Save failed.");
        setError(msg);
        setSubmitLoading(false);
        return;
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
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
      <div className="additem-card">
        <h1>{isEdit ? "Edit Clothing Item" : "Add Clothing Item"}</h1>
        <p className="additem-subtext">
          {isEdit ? "Update the details below." : "Upload a clothing item and add details so ClosetAI can use it for outfit recommendations."}
        </p>

        <form onSubmit={handleSubmit}>
          <label>Item Photo {isEdit && "(leave empty to keep current)"}</label>
          <input
            type="file"
            accept="image/*"
            className="additem-input"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />

          <label>Type</label>
          <select className="additem-input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Select type</option>
            {clothingTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {fieldErrors.type && <p className="additem-inline-error">{fieldErrors.type}</p>}

          <label>Color</label>
          <select className="additem-input" value={color} onChange={(e) => setColor(e.target.value)}>
            <option value="">Select color</option>
            {colors.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {fieldErrors.color && <p className="additem-inline-error">{fieldErrors.color}</p>}

          <label>Season</label>
          <select className="additem-input" value={season} onChange={(e) => setSeason(e.target.value)}>
            <option value="">Select season</option>
            {seasons.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {fieldErrors.season && <p className="additem-inline-error">{fieldErrors.season}</p>}

          <label>Style</label>
          <select className="additem-input" value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="">Select style</option>
            {styles.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {fieldErrors.style && <p className="additem-inline-error">{fieldErrors.style}</p>}

          <label>Notes (optional)</label>
          <textarea
            placeholder="Brand, fit, warmth level..."
            className="additem-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {error && <p className="additem-inline-error">{error}</p>}
          <button type="submit" className="button-primary additem-button" disabled={submitLoading}>
            {submitLoading ? "Saving..." : isEdit ? "Update Item" : "Save Item"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddItem;
