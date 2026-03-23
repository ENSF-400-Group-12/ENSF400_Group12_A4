// Profile: account and wardrobe summary

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../config/api";

function Profile() {
  const { user } = useAuth();
  const [itemCount, setItemCount] = useState(null);
  const [favoriteCount, setFavoriteCount] = useState(null);
  const [itemsError, setItemsError] = useState(false);
  const [favoritesError, setFavoritesError] = useState(false);
  const wardrobeValue = itemsError
    ? "Unavailable"
    : (itemCount === null ? "…" : itemCount);
  const favoritesValue = favoritesError
    ? "Unavailable"
    : (favoriteCount === null ? "…" : favoriteCount);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [itemsRes, favRes] = await Promise.all([
          authFetch("/api/items"),
          authFetch("/api/outfits/favorites"),
        ]);
        if (cancelled) return;
        if (itemsRes.ok) {
          const data = await itemsRes.json();
          setItemCount(Array.isArray(data.items) ? data.items.length : 0);
          setItemsError(false);
        } else {
          setItemsError(true);
          setItemCount(null);
        }
        if (favRes.ok) {
          const favData = await favRes.json();
          setFavoriteCount(Array.isArray(favData.favorites) ? favData.favorites.length : 0);
          setFavoritesError(false);
        } else {
          setFavoritesError(true);
          setFavoriteCount(null);
        }
      } catch (_) {
        if (!cancelled) {
          setItemsError(true);
          setFavoritesError(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h1>Profile</h1>
        <p className="profile-subtext">
          Your ClosetAI account and wardrobe summary.
        </p>

        <div className="profile-info">
          <div className="profile-row">
            <span className="profile-label">Email</span>
            <span className="profile-value">{user?.email ?? "Not signed in"}</span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Email status</span>
            <span className="profile-value">
              {user?.emailVerified ? "Verified" : "Verification needed"}
              {!user?.emailVerified && (
                <>
                  {" "}
                  <Link to="/verify-email" className="profile-inline-link">Verify now</Link>
                </>
              )}
            </span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Wardrobe items</span>
            <span className="profile-value">{wardrobeValue}</span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Saved outfits</span>
            <span className="profile-value">{favoritesValue}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
