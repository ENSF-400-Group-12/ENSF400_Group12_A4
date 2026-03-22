// Displays generated outfit from API: items, explanation, occasion, vibe; supports regenerate

import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import OutfitCard from "../components/OutfitCard";
import { authFetch } from "../config/api";

function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const outfit = location.state?.outfit;
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState(null);

  async function handleAddFavorite() {
    if (!outfit || outfit.error) return;
    setSaveError(null);
    setSaveStatus("saving");
    try {
      const res = await authFetch("/api/outfits/favorites", {
        method: "POST",
        body: JSON.stringify(outfit),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          res.status === 401
            ? "Please log in to save outfits."
            : data.error || "Could not save to favorites.";
        setSaveError(msg);
        setSaveStatus("idle");
        return;
      }
      setSaveStatus("saved");
    } catch (err) {
      setSaveError(
        err.name === "TypeError" && err.message?.includes("fetch")
          ? "Could not reach the server. Try again."
          : "Could not save to favorites."
      );
      setSaveStatus("idle");
    }
  }

  if (!outfit) {
    return (
      <div className="results-page">
        <h1>Outfit Recommendations</h1>
        <p className="results-empty">
          Generate an outfit first by choosing an occasion and vibe on the Generate page.
        </p>
        <div className="results-actions">
          <button
            type="button"
            className="button-primary"
            onClick={() => navigate("/generate")}
          >
            Generate Outfit
          </button>
        </div>
      </div>
    );
  }

  if (outfit.error) {
    const isWardrobe = /wardrobe|not enough/i.test(outfit.error);
    return (
      <div className="results-page">
        <h1>Outfit Recommendations</h1>
        <p className="results-error" role="alert">
          {outfit.error}
        </p>
        {outfit.suggestion && (
          <p className="results-hint" role="note">
            {outfit.suggestion}
          </p>
        )}
        {isWardrobe && (
          <p className="results-cta">
            <Link to="/add-item">Add items</Link> or <Link to="/dashboard">view your wardrobe</Link>, then try again.
          </p>
        )}
        <button
          type="button"
          className="button-primary"
          onClick={() => navigate("/generate")}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="results-page">
      <h1>Outfit Recommendations</h1>
      <OutfitCard outfit={outfit} />
      <div className="results-actions">
        <button
          type="button"
          className="button-secondary"
          onClick={handleAddFavorite}
          disabled={saveStatus === "saving" || saveStatus === "saved"}
        >
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
              ? "Saved to favorites"
              : "Add to favorites"}
        </button>
        <button
          type="button"
          className="button-primary"
          onClick={() => navigate("/generate")}
        >
          Regenerate
        </button>
      </div>
      {saveError && (
        <p className="results-save-error" role="alert">
          {saveError}
        </p>
      )}
      {saveStatus === "saved" && (
        <p className="results-save-ok">
          <Link to="/favorites">View favorites</Link>
        </p>
      )}
    </div>
  );
}

export default Results;
