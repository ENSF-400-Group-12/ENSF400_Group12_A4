// Profile — real account and wardrobe info

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../config/api";

function Profile() {
  const { user } = useAuth();
  const [itemCount, setItemCount] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/items");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setItemCount(Array.isArray(data.items) ? data.items.length : 0);
        } else {
          setLoadError("Could not load wardrobe count.");
        }
      } catch (_) {
        if (!cancelled) setLoadError("Could not load wardrobe count.");
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
            <span className="profile-value">{user?.email ?? "—"}</span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Wardrobe items</span>
            <span className="profile-value">
              {loadError ? "—" : itemCount !== null ? itemCount : "…"}
            </span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Saved outfits</span>
            <span className="profile-value profile-value--muted">Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
