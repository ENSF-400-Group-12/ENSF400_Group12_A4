// Card representing a generated outfit recommendation (API shape: items[], explanation, occasion, vibe)

import { apiUrl } from '../config/api';

function OutfitCard({ outfit, heading = "Recommended Outfit" }) {
  const { items = [], explanation, occasion, vibe } = outfit;
  const occStr = occasion != null ? String(occasion).trim() : '';
  const vibeStr = vibe != null ? String(vibe).trim() : '';
  const sameLabel =
    occStr &&
    vibeStr &&
    occStr.toLowerCase() === vibeStr.toLowerCase();

  return (
    <div className="card outfit-card">
      <h2>{heading}</h2>
      {(occStr || vibeStr) && (
        <div className="outfit-context">
          {sameLabel ? (
            <p className="outfit-context-line">
              <span className="outfit-context-k">Look</span>
              {occStr}
            </p>
          ) : (
            <>
              {occStr ? (
                <p className="outfit-context-line">
                  <span className="outfit-context-k">Occasion</span>
                  {occStr}
                </p>
              ) : null}
              {vibeStr ? (
                <p className="outfit-context-line">
                  <span className="outfit-context-k">Vibe</span>
                  {vibeStr}
                </p>
              ) : null}
            </>
          )}
          {outfit.reranked ? (
            <p className="outfit-context-ai" title="Picked from several rule-based options, then refined for coherence">
              AI-refined pick
            </p>
          ) : null}
        </div>
      )}
      <div className="outfit-items outfit-items--grid">
        {items.map((item) => {
          const imageUrl = item.image_path ? (item.image_path.startsWith('http') ? item.image_path : apiUrl(item.image_path)) : null;
          return (
            <div key={item.id} className="outfit-item">
              <div className="outfit-item-image-wrap">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="outfit-item-image" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.add('visible'); }} />
                ) : null}
                <div className={`outfit-item-no-image ${imageUrl ? '' : 'visible'}`}>No photo</div>
              </div>
              <div className="outfit-item-info">
                <span className="outfit-item-type">{item.type}</span>
                {item.color && <span className="outfit-item-detail"> {item.color}</span>}
                {item.style && item.style !== item.type && (
                  <span className="outfit-item-detail"> · {item.style}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {outfit.stylistConfidence && (
        <p className="outfit-stylist-confidence">Stylist pass: {outfit.stylistConfidence}</p>
      )}
      {explanation && (
        <p className="explanation">{explanation}</p>
      )}
    </div>
  );
}

export default OutfitCard;
