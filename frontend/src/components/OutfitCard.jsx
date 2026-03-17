// Card representing a generated outfit recommendation (API shape: items[], explanation, occasion, vibe)

function OutfitCard({ outfit }) {
  const { items = [], explanation, occasion, vibe } = outfit;

  return (
    <div className="card outfit-card">
      <h2>Recommended Outfit</h2>
      {occasion && vibe && (
        <p className="outfit-meta">
          {occasion} · {vibe}
        </p>
      )}
      <div className="outfit-items">
        {items.map((item) => (
          <div key={item.id} className="outfit-item">
            <span className="outfit-item-type">{item.type}</span>
            {item.color && <span className="outfit-item-detail"> {item.color}</span>}
            {item.style && item.style !== item.type && (
              <span className="outfit-item-detail"> · {item.style}</span>
            )}
          </div>
        ))}
      </div>
      {explanation && (
        <p className="explanation">{explanation}</p>
      )}
    </div>
  );
}

export default OutfitCard;
