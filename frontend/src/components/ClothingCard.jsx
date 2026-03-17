function ClothingCard({ item }) {
  return (
    <div className="card clothing-card">

      <img src={item.image} alt="clothing item" />

      <h3>{item.type}</h3>

      <p>{item.color}</p>

    </div>
  );
}

export default ClothingCard;