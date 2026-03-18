// Displays generated outfit from API: items, explanation, occasion, vibe; supports regenerate

import { useLocation, useNavigate, Link } from "react-router-dom";
import OutfitCard from "../components/OutfitCard";

function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const outfit = location.state?.outfit;

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
        {isWardrobe && (
          <>
            <p className="results-cta">
              Add at least one top, one bottom, and one pair of shoes to generate an outfit.
            </p>
            <div className="results-actions results-actions--stacked">
              <Link to="/add-item" className="button-primary">
                Add items to wardrobe
              </Link>
              <Link to="/dashboard" className="button-secondary">
                View wardrobe
              </Link>
            </div>
          </>
        )}
        {!isWardrobe && (
          <div className="results-actions">
            <button
              type="button"
              className="button-primary"
              onClick={() => navigate("/generate")}
            >
              Try Again
            </button>
          </div>
        )}
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
          className="button-primary"
          onClick={() => navigate("/generate")}
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}

export default Results;
