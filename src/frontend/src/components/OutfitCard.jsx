// Card representing a generated outfit recommendation

function OutfitCard({ outfit }) {

  return (

    <div className="card outfit-card">

      <h2>Recommended Outfit</h2>

      {/* Outfit components */}
      <p><strong>Top:</strong> {outfit.top}</p>
      <p><strong>Bottom:</strong> {outfit.bottom}</p>
      <p><strong>Shoes:</strong> {outfit.shoes}</p>

      {/* AI explanation */}
      <p className="explanation">
        {outfit.explanation}
      </p>

    </div>

  );
}

export default OutfitCard;