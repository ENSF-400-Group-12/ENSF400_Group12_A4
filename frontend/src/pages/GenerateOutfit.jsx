// Form for generating outfit recommendations — UI only, no backend logic yet

import { useState } from "react";

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
  const [occasion, setOccasion] = useState("");
  const [vibe, setVibe] = useState(null);

  return (
    <div className="generate-page">
      <div className="generate-card">
        <h1 className="generate-title">Generate Outfit</h1>
        <p className="generate-subtext">
          Pick an occasion and the vibe you want.
        </p>

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

        <button type="button" className="button-primary generate-button">
          Generate Outfit
        </button>
      </div>
    </div>
  );
}

export default GenerateOutfit;
