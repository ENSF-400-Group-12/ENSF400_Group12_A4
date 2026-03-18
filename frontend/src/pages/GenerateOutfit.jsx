// Form for generating outfit recommendations — occasion + vibe only, wired to API

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authFetch } from "../config/api";

const OCCASIONS = [
  "Casual",
  "Work",
  "School",
  "Date Night",
  "Formal",
  "Weekend",
  "Outdoor",
];

const VIBES = [
  "Casual",
  "Formal",
  "Minimalist",
  "Sporty",
  "Classy",
  "Streetwear",
  "Vintage",
  "Emo",
];

function GenerateOutfit() {
  const navigate = useNavigate();
  const [occasion, setOccasion] = useState("");
  const [vibe, setVibe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!occasion || !vibe) {
      setError("Please select both occasion and style/vibe.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await authFetch("/api/outfits/generate", {
        method: "POST",
        body: JSON.stringify({ occasion, vibe }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || "Generation failed. Try again.";
        if (res.status === 401) {
          setError("Please log in to generate outfits.");
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }
      navigate("/results", { state: { outfit: data } });
    } catch (err) {
      const msg = err.name === "TypeError" && (err.message === "Failed to fetch" || err.message?.includes("fetch"))
        ? "Could not reach the server. Start the backend and try again."
        : "Could not reach the server. Check that the backend is running.";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="generate-page">
      <div className="generate-card">
        <h1 className="generate-title">Generate Outfit</h1>
        <p className="generate-subtext">
          Pick an occasion and the vibe you want.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="generate-field">
            <label htmlFor="generate-occasion">Occasion</label>
            <select
              id="generate-occasion"
              className="generate-input"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
            >
              <option value="">Select occasion</option>
              {OCCASIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="generate-field">
            <span className="generate-label">Style / Vibe</span>
            <p className="generate-hint">Choose one</p>
            <div className="generate-chips" role="group" aria-label="Style or vibe">
              {VIBES.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`generate-chip ${vibe === opt ? "generate-chip--selected" : ""}`}
                  onClick={() => setVibe(vibe === opt ? null : opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="generate-feedback" role="alert">
              <p className="generate-error">{error}</p>
              {(error.toLowerCase().includes("wardrobe") || error.toLowerCase().includes("not enough")) && (
                <p className="generate-cta">
                  <Link to="/add-item">Add items to your wardrobe</Link> or try again later.
                </p>
              )}
              {error.includes("log in") && (
                <p className="generate-cta">
                  <Link to="/">Go to login</Link>
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="button-primary generate-button"
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate Outfit"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default GenerateOutfit;
