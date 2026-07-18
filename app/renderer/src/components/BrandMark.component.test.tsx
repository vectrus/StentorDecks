import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('shows StentorDeck and for julius (lowercase j)', () => {
    render(<BrandMark />);
    expect(screen.getByText('StentorDeck')).toBeInTheDocument();
    expect(screen.getByText('for julius')).toBeInTheDocument();
    expect(screen.queryByText('for Julius')).not.toBeInTheDocument();
  });

  it('hides wordmark when compact', () => {
    render(<BrandMark compact />);
    expect(screen.queryByText('StentorDeck')).not.toBeInTheDocument();
  });
});
