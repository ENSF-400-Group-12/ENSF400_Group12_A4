// Card representing a generated outfit recommendation (API shape: items[], explanation, occasion, vibe)

import { apiUrl } from '../config/api';

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
      {explanation && (
        <p className="explanation">{explanation}</p>
      )}
    </div>
  );
}

export default OutfitCard;
