/**
 * Tests for Card Component
 *
 * Tests rendering in different display modes and interactive behavior.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './Card';
import { CardInstance } from '@projective-set/shared';

describe('Card', () => {
  const createCard = (value: number): CardInstance => ({
    id: `card-${value}`,
    value,
  });

  describe('rendering', () => {
    it('should render with role="button"', () => {
      render(<Card card={createCard(42)} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have tabIndex 0 for keyboard accessibility', () => {
      render(<Card card={createCard(42)} />);
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('standard display mode', () => {
    it('should render dots for card value 42 (101010)', () => {
      const { container } = render(
        <Card card={createCard(42)} displayMode="standard" />
      );

      // Card 42 = 101010 binary = dots at positions 1, 3, 5 (0-indexed)
      const dots = container.querySelectorAll('.card__dot');
      expect(dots.length).toBe(3); // 3 dots visible
    });

    it('should render dots for card value 63 (111111)', () => {
      const { container } = render(
        <Card card={createCard(63)} displayMode="standard" />
      );

      const dots = container.querySelectorAll('.card__dot');
      expect(dots.length).toBe(6); // All 6 dots visible
    });

    it('should render dots for card value 1 (000001)', () => {
      const { container } = render(
        <Card card={createCard(1)} displayMode="standard" />
      );

      const dots = container.querySelectorAll('.card__dot');
      expect(dots.length).toBe(1); // Only 1 dot visible
    });

    it('should render colored dots in standard mode', () => {
      const { container } = render(
        <Card card={createCard(1)} displayMode="standard" />
      );

      const dot = container.querySelector('.card__dot');
      expect(dot).toHaveStyle({ backgroundColor: '#ff0000' }); // First dot is red
    });
  });

  describe('colorless display mode', () => {
    it('should render grey dots in colorless mode', () => {
      const { container } = render(
        <Card card={createCard(1)} displayMode="colorless" />
      );

      const dot = container.querySelector('.card__dot');
      expect(dot).toHaveStyle({ backgroundColor: '#888888' });
    });
  });

  describe('binary display mode', () => {
    it('should show binary representation', () => {
      render(<Card card={createCard(42)} displayMode="binary" />);
      expect(screen.getByText('101010')).toBeInTheDocument();
    });

    it('should pad binary to 6 digits', () => {
      render(<Card card={createCard(1)} displayMode="binary" />);
      expect(screen.getByText('000001')).toBeInTheDocument();
    });

    it('should show 111111 for card 63', () => {
      render(<Card card={createCard(63)} displayMode="binary" />);
      expect(screen.getByText('111111')).toBeInTheDocument();
    });

    it('should not show dots in binary mode', () => {
      const { container } = render(
        <Card card={createCard(42)} displayMode="binary" />
      );

      const dots = container.querySelectorAll('.card__dot');
      expect(dots.length).toBe(0);
    });
  });

  describe('selection state', () => {
    it('should add selected class when isSelected is true', () => {
      const { container } = render(
        <Card card={createCard(42)} isSelected={true} />
      );

      expect(container.querySelector('.card--selected')).toBeInTheDocument();
    });

    it('should not have selected class when isSelected is false', () => {
      const { container } = render(
        <Card card={createCard(42)} isSelected={false} />
      );

      expect(container.querySelector('.card--selected')).not.toBeInTheDocument();
    });
  });

  describe('click handling', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Card card={createCard(42)} onClick={handleClick} />);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Enter key is pressed', () => {
      const handleClick = vi.fn();
      render(<Card card={createCard(42)} onClick={handleClick} />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick for other keys', () => {
      const handleClick = vi.fn();
      render(<Card card={createCard(42)} onClick={handleClick} />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Space' });
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not crash if onClick is not provided', () => {
      render(<Card card={createCard(42)} />);

      // Should not throw
      fireEvent.click(screen.getByRole('button'));
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    });
  });

  describe('visual effects', () => {
    it('should apply claim highlight color when provided', () => {
      const { container } = render(
        <Card card={createCard(42)} claimHighlightColor="#FF0000" />
      );

      const card = container.querySelector('.card') as HTMLElement;
      expect(card).toBeTruthy();
      // Check that the inline style attribute contains the color
      expect(card.style.boxShadow).toContain('#FF0000');
    });

    it('should apply other player color glow when provided', () => {
      const { container } = render(
        <Card card={createCard(42)} otherPlayerColors={['#00FF00']} />
      );

      const card = container.querySelector('.card') as HTMLElement;
      expect(card).toBeTruthy();
      // Check that the inline style attribute contains the color
      expect(card.style.boxShadow).toContain('#00FF00');
    });

    it('should prioritize claim highlight over other player colors', () => {
      const { container } = render(
        <Card
          card={createCard(42)}
          claimHighlightColor="#FF0000"
          otherPlayerColors={['#00FF00']}
        />
      );

      const card = container.querySelector('.card') as HTMLElement;
      expect(card).toBeTruthy();
      // Claim highlight should be applied, not other player color
      expect(card.style.boxShadow).toContain('#FF0000');
      expect(card.style.boxShadow).not.toContain('#00FF00');
    });
  });

  describe('all card values', () => {
    it('should render all valid card values (1-63) without error', () => {
      for (let value = 1; value <= 63; value++) {
        const { unmount } = render(<Card card={createCard(value)} />);
        unmount();
      }
    });

    it('should have correct number of dots for each card value', () => {
      // Test a sample of cards
      const testCases = [
        { value: 1, expectedDots: 1 },   // 000001
        { value: 7, expectedDots: 3 },   // 000111
        { value: 21, expectedDots: 3 },  // 010101
        { value: 42, expectedDots: 3 },  // 101010
        { value: 63, expectedDots: 6 },  // 111111
      ];

      for (const { value, expectedDots } of testCases) {
        const { container, unmount } = render(
          <Card card={createCard(value)} displayMode="standard" />
        );

        const dots = container.querySelectorAll('.card__dot');
        expect(dots.length).toBe(expectedDots);
        unmount();
      }
    });
  });
});
