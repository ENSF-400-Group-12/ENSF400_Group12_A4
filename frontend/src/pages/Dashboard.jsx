// Wardrobe Dashboard
// Central hub for viewing and managing clothing items

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ClothingCard from "../components/ClothingCard";
import { authFetch, apiUrl } from "../config/api";

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

function Dashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [filterStyle, setFilterStyle] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/items");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = res.status === 401
          ? "Please log in to view your wardrobe."
          : (data.error || "Failed to load wardrobe.");
        throw new Error(msg);
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      const message = err.message || "Failed to load wardrobe.";
      setError(err.name === "TypeError" && err.message?.includes("fetch")
        ? "Could not reach the server. Start the backend (e.g. npm start in backend) and try again."
        : message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      const res = await authFetch(`/api/items/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchItems();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Delete failed.");
      }
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const handleLoadDemo = async () => {
    try {
      const res = await authFetch("/api/demo/seed", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await fetchItems();
      } else {
        const msg = res.status === 401
          ? "Please log in first to load the demo wardrobe."
          : (data.error || "Failed to load demo wardrobe.");
        alert(msg);
      }
    } catch (err) {
      alert("Could not reach server. Start the backend and try again.");
    }
  };

  const searchLower = search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (searchLower) {
      const text = [item.type, item.color, item.season, item.style, item.notes].filter(Boolean).join(" ").toLowerCase();
      if (!text.includes(searchLower)) return false;
    }
    if (filterType && item.type !== filterType) return false;
    if (filterColor && item.color !== filterColor) return false;
    if (filterSeason && item.season !== filterSeason) return false;
    if (filterStyle && item.style !== filterStyle) return false;
    return true;
  });

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-top">
          <h1 className="dashboard-title">Your Wardrobe</h1>
          {!loading && !error && (
            <span className="dashboard-count" aria-live="polite">
              {filtered.length === items.length ? `${items.length} item${items.length !== 1 ? "s" : ""}` : `${filtered.length} of ${items.length}`}
            </span>
          )}
        </div>
        <p className="dashboard-subtext">
          Add items, search, and filter. Your main hub for your closet.
        </p>
      </header>

      {items.length > 0 && (
        <section className="dashboard-actions" aria-label="Quick actions">
          <Link to="/add-item" className="dashboard-action-card dashboard-action-card--primary">
            <span className="dashboard-action-label">Add Item</span>
            <span className="dashboard-action-desc">Upload a photo and add to your wardrobe</span>
          </Link>
          <Link to="/generate" className="dashboard-action-card">
            <span className="dashboard-action-label">Generate Outfit</span>
            <span className="dashboard-action-desc">Get outfit suggestions</span>
          </Link>
        </section>
      )}

      {items.length > 0 && (
        <>
          <div className="dashboard-controls">
            <input
              type="search"
              className="dashboard-search"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search wardrobe"
            />
          </div>

          <div className="dashboard-filters" role="group" aria-label="Filter by">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="dashboard-filter-select" aria-label="Type">
              <option value="">Type</option>
              {clothingTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={filterColor} onChange={(e) => setFilterColor(e.target.value)} className="dashboard-filter-select" aria-label="Color">
              <option value="">Color</option>
              {colors.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)} className="dashboard-filter-select" aria-label="Season">
              <option value="">Season</option>
              {seasons.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={filterStyle} onChange={(e) => setFilterStyle(e.target.value)} className="dashboard-filter-select" aria-label="Style">
              <option value="">Style</option>
              {styles.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {loading && <p className="dashboard-message" aria-live="polite">Loading…</p>}
      {error && <p className="dashboard-message dashboard-error" role="alert">{error}</p>}
      {!loading && !error && filtered.length > 0 && (
        <div className="clothing-grid">
          {filtered.map((item) => (
            <ClothingCard
              key={item.id}
              item={item}
              imageUrl={item.image_path ? apiUrl(item.image_path) : null}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="dashboard-empty">
          {items.length > 0 && (search.trim() || filterType || filterColor || filterSeason || filterStyle) ? (
            <>
              <p className="dashboard-empty-text">No items match your search or filters.</p>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setSearch("");
                  setFilterType("");
                  setFilterColor("");
                  setFilterSeason("");
                  setFilterStyle("");
                }}
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="dashboard-empty-text">Your wardrobe is empty. Add your first item to get started.</p>
              <div className="dashboard-empty-actions">
                <Link to="/add-item">
                  <button type="button" className="button-primary">Add Item</button>
                </Link>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={handleLoadDemo}
                >
                  Load demo wardrobe
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
