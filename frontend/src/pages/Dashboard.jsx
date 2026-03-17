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
        throw new Error(data.error || "Failed to load wardrobe.");
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || "Failed to load wardrobe.");
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
      <div className="dashboard-header">
        <h1>Your Wardrobe</h1>
        <p className="dashboard-subtext">
          Search, filter, and manage your clothing items.
        </p>
      </div>

      <div className="dashboard-controls">
        <input
          className="search-bar"
          placeholder="Search clothing items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="dashboard-buttons">
          <Link to="/add-item">
            <button className="button-primary">Add Item</button>
          </Link>
          <Link to="/generate">
            <button className="button-primary">Generate Outfit</button>
          </Link>
        </div>
      </div>

      <div className="filters">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Type</option>
          {clothingTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select value={filterColor} onChange={(e) => setFilterColor(e.target.value)}>
          <option value="">Color</option>
          {colors.map((color) => (
            <option key={color} value={color}>{color}</option>
          ))}
        </select>
        <select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}>
          <option value="">Season</option>
          {seasons.map((season) => (
            <option key={season} value={season}>{season}</option>
          ))}
        </select>
        <select value={filterStyle} onChange={(e) => setFilterStyle(e.target.value)}>
          <option value="">Style</option>
          {styles.map((style) => (
            <option key={style} value={style}>{style}</option>
          ))}
        </select>
      </div>

      {loading && <p className="dashboard-message">Loading...</p>}
      {error && <p className="dashboard-message dashboard-error">{error}</p>}
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
          {search.trim() || filterType || filterColor || filterSeason || filterStyle ? (
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
              <Link to="/add-item">
                <button type="button" className="button-primary">Add Item</button>
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
