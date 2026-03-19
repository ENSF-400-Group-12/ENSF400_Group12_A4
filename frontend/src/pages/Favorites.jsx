// Saved outfits — coming soon

import { Link } from "react-router-dom";

function Favorites() {
  return (
    <div className="favorites-page">
      <div className="favorites-card">
        <h1>Saved Outfits</h1>
        <p className="favorites-subtext">
          Save and revisit your favorite outfit combinations. This feature is coming soon.
        </p>
        <Link to="/dashboard" className="button-primary">
          Back to Wardrobe
        </Link>
      </div>
    </div>
  );
}

export default Favorites;
