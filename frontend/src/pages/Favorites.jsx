// Saved outfits from the user’s account (persisted on the server)

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import OutfitCard from "../components/OutfitCard";
import ConfirmDialog from "../components/ConfirmDialog";
import { authFetch } from "../config/api";

function formatSavedAt(createdAt) {
  if (!createdAt) return "";
  const normalized = createdAt.includes("T") ? createdAt : createdAt.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return createdAt;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [removeConfirmId, setRemoveConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/outfits/favorites");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          res.status === 401
            ? "Please log in to view favorites."
            : data.error || "Failed to load favorites.";
        throw new Error(msg);
      }
      setFavorites(data.favorites || []);
    } catch (err) {
      const message =
        err.name === "TypeError" && err.message?.includes("fetch")
          ? "Could not reach the server. Start the backend and try again."
          : err.message || "Failed to load favorites.";
      setError(message);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function executeRemoveFavorite() {
    if (removeConfirmId == null) return;
    const id = removeConfirmId;
    setRemoveConfirmId(null);
    setRemovingId(id);
    try {
      const res = await authFetch(`/api/outfits/favorites/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFavorites((prev) => prev.filter((f) => f.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error || "Could not remove favorite.");
      }
    } catch {
      window.alert("Could not remove favorite.");
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="favorites-page favorites-page--list">
        <p className="favorites-loading">Loading favorites…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="favorites-page favorites-page--list">
        <p className="favorites-error" role="alert">
          {error}
        </p>
        <Link to="/dashboard" className="button-primary">
          Back to Wardrobe
        </Link>
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <div className="favorites-page favorites-page--list">
        <h1 className="favorites-title">Favorites</h1>
        <p className="favorites-empty">
          You have not saved any outfits yet. Generate a look and use{" "}
          <strong>Add to favorites</strong> on the results page.
        </p>
        <div className="favorites-empty-actions">
          <Link to="/generate" className="button-primary">
            Generate outfit
          </Link>
          <Link to="/dashboard" className="button-secondary">
            Wardrobe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page favorites-page--list">
      <ConfirmDialog
        open={removeConfirmId != null}
        title="Remove saved outfit?"
        message="This outfit will be removed from your favorites. You can save a new one anytime."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        danger
        onCancel={() => setRemoveConfirmId(null)}
        onConfirm={executeRemoveFavorite}
      />
      <h1 className="favorites-title">Favorites</h1>
      <p className="favorites-intro">
        Outfits you saved from recommendations.{" "}
        <Link to="/generate">Generate another look</Link>
      </p>
      <ul className="favorites-list">
        {favorites.map((fav) => {
          const { id, created_at: createdAt, ...outfit } = fav;
          return (
            <li key={id} className="favorites-list-item">
              <div className="favorites-item-meta">
                <span className="favorites-saved-at">
                  Saved {formatSavedAt(createdAt)}
                </span>
                <button
                  type="button"
                  className="button-secondary favorites-remove"
                  onClick={() => setRemoveConfirmId(id)}
                  disabled={removingId === id}
                >
                  {removingId === id ? "Removing…" : "Remove"}
                </button>
              </div>
              <OutfitCard outfit={outfit} heading="Saved outfit" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Favorites;
