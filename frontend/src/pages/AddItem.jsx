// Page for uploading new clothing items

function AddItem() {

  return (

    <div className="additem-page">

      <div className="additem-card">

        <h1>Add Clothing Item</h1>

        <p className="additem-subtext">
          Upload a clothing item and add details so ClosetAI can use it for outfit recommendations.
        </p>

        {/* Image upload */}

        <label>Item Photo</label>
        <input
          type="file"
          accept="image/*"
          className="additem-input"
        />

        {/* Type */}

        <label>Type</label>
        <select className="additem-input">
          <option>Shirt</option>
          <option>Pants</option>
          <option>Jacket</option>
          <option>Shoes</option>
          <option>Accessories</option>
        </select>

        {/* Color */}

        <label>Color</label>
        <input
          type="text"
          placeholder="Black, Blue, White..."
          className="additem-input"
        />

        {/* Season */}

        <label>Season</label>
        <select className="additem-input">
          <option>All Season</option>
          <option>Summer</option>
          <option>Winter</option>
          <option>Fall</option>
          <option>Spring</option>
        </select>

        {/* Style */}

        <label>Style</label>
        <input
          type="text"
          placeholder="Casual, Formal, Streetwear..."
          className="additem-input"
        />

        {/* Notes */}

        <label>Notes (optional)</label>
        <textarea
          placeholder="Brand, fit, warmth level..."
          className="additem-textarea"
        />

        <button className="button-primary additem-button">
          Save Item
        </button>

      </div>

    </div>

  );

}

export default AddItem;