// Displays AI generated outfits

import OutfitCard from "../components/OutfitCard";

function Results() {

  const outfit = {
    top: "White Shirt",
    bottom: "Black Jeans",
    shoes: "Sneakers",
    explanation: "Neutral colors create a balanced casual outfit."
  };

  return (

    <div>

      <h1>Outfit Recommendations</h1>

      <OutfitCard outfit={outfit} />

    </div>

  );
}

export default Results;