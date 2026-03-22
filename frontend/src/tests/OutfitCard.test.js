import React from 'react';
import { render, screen } from '@testing-library/react';
import OutfitCard from '../components/OutfitCard';

/** Matches backend /api/outfits/generate payload: items use id, type, color, style, image_path */
const mockOutfit = {
  occasion: 'Casual',
  vibe: 'Casual',
  explanation: 'Perfect for a casual day',
  items: [
    { id: 1, type: 'T-Shirt', color: 'White', style: 'Casual', image_path: null },
    { id: 2, type: 'Jeans', color: 'Blue', style: 'Casual', image_path: null },
    { id: 3, type: 'Sneakers', color: 'White', style: 'Sport', image_path: null },
  ],
};

describe('OutfitCard', () => {
  it('renders outfit details correctly', () => {
    render(<OutfitCard outfit={mockOutfit} />);

    expect(screen.getByText(/t-shirt/i)).toBeInTheDocument();
    expect(screen.getByText(/jeans/i)).toBeInTheDocument();
    expect(screen.getByText(/sneakers/i)).toBeInTheDocument();
    expect(screen.getByText(/perfect for a casual day/i)).toBeInTheDocument();
  });

  it('shows Look label when occasion and vibe match', () => {
    render(<OutfitCard outfit={mockOutfit} />);
    expect(screen.getByText(/look/i)).toBeInTheDocument();
  });

  it('shows Occasion and Vibe when they differ', () => {
    render(
      <OutfitCard
        outfit={{
          ...mockOutfit,
          occasion: 'Work',
          vibe: 'Formal',
        }}
      />
    );
    expect(screen.getByText(/occasion/i)).toBeInTheDocument();
    expect(screen.getByText(/vibe/i)).toBeInTheDocument();
  });
});
