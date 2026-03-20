import { render, screen } from "@testing-library/react";
import OutfitCard from "../components/OutfitCard"; 

test("renders outfit details correctly", () => {
  const mockOutfit = {
    top: "T-shirt",
    bottom: "Jeans",
    shoes: "Sneakers",
    explanation: "Perfect for a casual day"
  };

  render(<OutfitCard outfit={mockOutfit} />);

  expect(screen.getByText(/t-shirt/i)).toBeInTheDocument();
  expect(screen.getByText(/jeans/i)).toBeInTheDocument();
  expect(screen.getByText(/sneakers/i)).toBeInTheDocument();
  expect(screen.getByText(/perfect for a casual day/i)).toBeInTheDocument();
});