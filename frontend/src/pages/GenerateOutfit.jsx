// Form for generating outfit recommendations — occasion + vibe only, wired to API

import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed. Try again.");
        setLoading(false);
        return;
      }
      navigate("/results", { state: { outfit: data } });
    } catch (err) {
      setError("Could not reach the server. Check that the backend is running.");
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
            <p className="generate-error" role="alert">
              {error}
            </p>
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
