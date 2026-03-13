// Wardrobe Dashboard
// Central hub for viewing and managing clothing items

import { Link } from "react-router-dom";
import ClothingCard from "../components/ClothingCard";

function Dashboard() {

  // ===============================
  // Filter Data (expandable later)
  // ===============================

  // Clothing types
  const clothingTypes = [
    "Shirt",
    "T-Shirt",
    "Hoodie",
    "Sweater",
    "Jacket",
    "Coat",
    "Blazer",
    "Pants",
    "Jeans",
    "Shorts",
    "Skirt",
    "Dress",
    "Shoes",
    "Boots",
    "Sneakers",
    "Sandals",
    "Hat",
    "Accessories"
  ];

  // Common clothing colors
  const colors = [
    "Black",
    "White",
    "Gray",
    "Brown",
    "Beige",
    "Navy",
    "Blue",
    "Light Blue",
    "Red",
    "Burgundy",
    "Green",
    "Olive",
    "Yellow",
    "Orange",
    "Purple",
    "Pink",
    "Cream"
  ];

  // Seasons
  const seasons = [
    "Spring",
    "Summer",
    "Fall",
    "Winter",
    "All Season"
  ];

  // Style categories
  const styles = [
    "Casual",
    "Formal",
    "Business",
    "Streetwear",
    "Sport",
    "Athletic",
    "Minimalist",
    "Vintage",
    "Smart Casual"
  ];

  // =====================================
  // Temporary Sample Clothing Items
  // (Later this will come from database)
  // =====================================

  const clothingItems = [
    {
      id: 1,
      name: "Black Jacket",
      image: "/sample-jacket.jpg",
      type: "Jacket",
      color: "Black",
      season: "Winter",
      style: "Casual"
    },
    {
      id: 2,
      name: "Blue Jeans",
      image: "/sample-jeans.jpg",
      type: "Jeans",
      color: "Blue",
      season: "All Season",
      style: "Casual"
    },
    {
      id: 3,
      name: "White Dress Shirt",
      image: "/sample-shirt.jpg",
      type: "Shirt",
      color: "White",
      season: "All Season",
      style: "Formal"
    },
    {
      id: 4,
      name: "Brown Leather Boots",
      image: "/sample-boots.jpg",
      type: "Boots",
      color: "Brown",
      season: "Winter",
      style: "Casual"
    }
  ];

  return (

    <div className="dashboard-page">

      {/* Header */}
      <div className="dashboard-header">

        <h1>Your Wardrobe</h1>

        <p className="dashboard-subtext">
          Search, filter, and manage your clothing items.
        </p>

      </div>


      {/* Search + Action Buttons */}
      <div className="dashboard-controls">

        <input
          className="search-bar"
          placeholder="Search clothing items..."
        />

        <div className="dashboard-buttons">

          <Link to="/add-item">
            <button className="button-primary">
              Add Item
            </button>
          </Link>

          <Link to="/generate">
            <button className="button-primary">
              Generate Outfit
            </button>
          </Link>

        </div>

      </div>


      {/* Filters */}
      <div className="filters">

        {/* Clothing Type */}
        <select>
          <option>Type</option>

          {clothingTypes.map(type => (
            <option key={type}>{type}</option>
          ))}

        </select>

        {/* Colors */}
        <select>
          <option>Color</option>

          {colors.map(color => (
            <option key={color}>{color}</option>
          ))}

        </select>

        {/* Seasons */}
        <select>
          <option>Season</option>

          {seasons.map(season => (
            <option key={season}>{season}</option>
          ))}

        </select>

        {/* Styles */}
        <select>
          <option>Style</option>

          {styles.map(style => (
            <option key={style}>{style}</option>
          ))}

        </select>

      </div>


      {/* Clothing Grid */}
      <div className="clothing-grid">

        {clothingItems.map(item => (
          <ClothingCard key={item.id} item={item} />
        ))}

      </div>

    </div>

  );

}

export default Dashboard;