import { Link } from "react-router-dom";

function ClothingCard({ item, imageUrl, onDelete }) {
  return (
    <div className="card clothing-card">
      <div className="clothing-card-image-wrap">
        {imageUrl ? (
          <img src={imageUrl} alt="" onError={(e) => { e.target.style.display = "none"; e.target.nextElementSibling?.classList.add("visible"); }} />
        ) : null}
        <div className={`clothing-card-no-image ${imageUrl ? "" : "visible"}`}>No photo</div>
      </div>
      <h3>{item.type}</h3>
      <p className="clothing-card-meta">{item.color} · {item.season} · {item.style}</p>
      <div className="clothing-card-actions">
        <Link to={`/edit-item/${item.id}`} className="button-secondary button-small">Edit</Link>
        <button
          type="button"
          className="button-danger button-small"
          onClick={() => onDelete(item.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default ClothingCard;
