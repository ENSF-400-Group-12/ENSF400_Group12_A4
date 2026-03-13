
// Form for generating AI outfit recommendations

function GenerateOutfit() {

  return (

    <div className="form-page">

      <h1>Generate Outfit</h1>

      <input type="text" placeholder="Occasion (work, casual)" />

      <input type="text" placeholder="Weather (optional)" />

      <button className="button-primary">
        Generate Outfit
      </button>

    </div>

  );
}

export default GenerateOutfit;