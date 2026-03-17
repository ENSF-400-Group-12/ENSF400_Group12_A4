// Form for generating AI outfit recommendations

function GenerateOutfit() {

  return (

    <div className="generate-page">

      <div className="generate-card">

        <h1>Generate Outfit</h1>

        <p className="generate-subtext">
          Choose the occasion and preferences for your outfit.
        </p>

        {/* Occasion */}

        <label>Occasion</label>

        <select className="generate-input">
          <option>Casual</option>
          <option>School</option>
          <option>Work</option>
          <option>Formal</option>
        </select>

        {/* Weather */}

        <label>Weather Context (optional)</label>

        <input
          type="text"
          placeholder="Cold, rainy, warm..."
          className="generate-input"
        />

        <label className="checkbox-row">
          <input type="checkbox" />
          Use current weather
        </label>

        {/* Style Preferences */}

        <h3 className="generate-section-title">
          Style Preferences
        </h3>

        <div className="style-options">

          <label>
            <input type="checkbox" />
            More Formal
          </label>

          <label>
            <input type="checkbox" />
            Layering
          </label>

          <label>
            <input type="checkbox" />
            Neutral Colors
          </label>

        </div>

        <button className="button-primary generate-button">
          Generate Outfit
        </button>

      </div>

    </div>

  );
}

export default GenerateOutfit;