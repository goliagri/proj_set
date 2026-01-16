/**
 * Tests for GameBoard Component
 *
 * Tests card grid rendering, selection handling, and confirm button behavior.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameBoard } from './GameBoard';
import { CardInstance, Player, DEFAULT_SINGLE_PLAYER_SETTINGS } from '@projective-set/shared';

describe('GameBoard', () => {
  const createTestCards = (count: number = 7): CardInstance[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `card-${i}`,
      value: i + 1,
    }));

  const createTestPlayer = (overrides: Partial<Player> = {}): Player => ({
    id: 'player1',
    name: 'Test Player',
    playerNumber: 1,
    color: '#3B82F6',
    claimedCards: [],
    selectedCardIds: [],
    score: 0,
    isConnected: true,
    isReady: true,
    ...overrides,
  });

  describe('rendering', () => {
    it('should render all active cards', () => {
      const cards = createTestCards(7);
      render(
        <GameBoard
          activeCards={cards}
          players={[createTestPlayer()]}
          currentPlayerId="player1"
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
        />
      );

      // Should have 7 card buttons
      const cardButtons = screen.getAllByRole('button');
      expect(cardButtons.length).toBe(7);
    });

    it('should display deck counter when provided', () => {
      render(
        <GameBoard
          activeCards={createTestCards()}
          players={[createTestPlayer()]}
          currentPlayerId="player1"
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          deckCount={56}
        />
      );

      expect(screen.getByText('56 cards left in deck')).toBeInTheDocument();
    });

    it('should not display deck counter when not provided', () => {
      render(
        <GameBoard
          activeCards={createTestCards()}
          players={[createTestPlayer()]}
          currentPlayerId="player1"
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
        />
      );

      expect(screen.queryByText(/cards left in deck/)).not.toBeInTheDocument();
    });
  });

  describe('card selection', () => {
    it('should call onCardClick when a card is clicked', () => {
      const handleCardClick = vi.fn();
      const cards = createTestCards();

      render(
        <GameBoard
          activeCards={cards}
          players={[createTestPlayer()]}
          currentPlayerId="player1"
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onCardClick={handleCardClick}
        />
      );

      const cardButtons = screen.getAllByRole('button');
      fireEvent.click(cardButtons[0]);

      expect(handleCardClick).toHaveBeenCalledWith('card-0');
    });

    it('should highlight selected cards for current player', () => {
      const cards = createTestCards();
      const player = createTestPlayer({
        selectedCardIds: ['card-0', 'card-1'],
      });

      const { container } = render(
        <GameBoard
          activeCards={cards}
          players={[player]}
          currentPlayerId="player1"
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
        />
      );

      const selectedCards = container.querySelectorAll('.card--selected');
      expect(selectedCards.length).toBe(2);
    });
  });

  describe('display modes', () => {
    it('should show binary mode when binaryMode is enabled', () => {
      const cards = createTestCards(1);
      const settings = {
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        binaryMode: true,
      };

      render(
        <GameBoard
          activeCards={cards}
          players={[createTestPlayer()]}
          currentPlayerId="player1"
          settings={settings}
        />
      );

      // Card 1 in binary is 000001
      expect(screen.getByText('000001')).toBeInTheDocument();
    });

    it('should show colorless mode when colorsEnabled is false', () => {
      const cards = createTestCards(1);
      const settings = {
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        colorsEnabled: false,
      };

      const { container } = render(
        <GameBoard
          activeCards={cards}
          players={[createTestPlayer()]}
          currentPlayerId="player1"
          settings={settings}
        />
      );

      const dot = container.querySelector('.card__dot');
      expect(dot).toHaveStyle({ backgroundColor: '#888888' });
    });
  });

  describe('confirm button (click mode)', () => {
    it('should not show confirm button in immediate mode', () => {
      const player = createTestPlayer({
        selectedCardIds: ['card-0', 'card-1', 'card-2'],
      });

      render(
        <GameBoard
          activeCards={createTestCards()}
          players={[player]}
          currentPlayerId="player1"
          settings={{
            ...DEFAULT_SINGLE_PLAYER_SETTINGS,
            setFoundBehavior: 'immediate',
          }}
        />
      );

      expect(screen.queryByText('Claim Set')).not.toBeInTheDocument();
    });

    it('should show confirm button in click mode with 3+ cards selected', () => {
      const player = createTestPlayer({
        selectedCardIds: ['card-0', 'card-1', 'card-2'],
      });

      render(
        <GameBoard
          activeCards={createTestCards()}
          players={[player]}
          currentPlayerId="player1"
          settings={{
            ...DEFAULT_SINGLE_PLAYER_SETTINGS,
            setFoundBehavior: 'click',
          }}
        />
      );

      expect(screen.getByText('Claim Set')).toBeInTheDocument();
    });

    it('should not show confirm button with fewer than 3 cards selected', () => {
      const player = createTestPlayer({
        selectedCardIds: ['card-0', 'card-1'],
      });

      render(
        <GameBoard
          activeCards={createTestCards()}
          players={[player]}
          currentPlayerId="player1"
          settings={{
            ...DEFAULT_SINGLE_PLAYER_SETTINGS,
            setFoundBehavior: 'click',
          }}
        />
      );

      expect(screen.queryByText('Claim Set')).not.toBeInTheDocument();
    });

    it('should call onConfirmSet when confirm button is clicked', () => {
      const handleConfirm = vi.fn();
      const player = createTestPlayer({
        selectedCardIds: ['card-0', 'card-1', 'card-2'],
      });

      render(
        <GameBoard
          activeCards={createTestCards()}
          players={[player]}
          currentPlayerId="player1"
          settings={{
            ...DEFAULT_SINGLE_PLAYER_SETTINGS,
            setFoundBehavior: 'click',
          }}
          onConfirmSet={handleConfirm}
        />
      );

      fireEvent.click(screen.getByText('Claim Set'));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiplayer features', () => {
    it('should show other players selections as glows', () => {
      const cards = createTestCards();
      const player1 = createTestPlayer({ id: 'player1' });
      const player2 = createTestPlayer({
        id: 'player2',
        color: '#00FF00',
        selectedCardIds: ['card-0'],
      });

      const { container } = render(
        <GameBoard
          activeCards={cards}
          players={[player1, player2]}
          currentPlayerId="player1"
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
        />
      );

      // The first card should have the other player's color in its inline style
      const firstCard = container.querySelector('.card') as HTMLElement;
      expect(firstCard).toBeTruthy();
      expect(firstCard.style.boxShadow).toContain('#00FF00');
    });

    it('should apply claim highlight to all cards when provided', () => {
      const cards = createTestCards(2);

      const { container } = render(
        <GameBoard
          activeCards={cards}
          players={[createTestPlayer()]}
          currentPlayerId="player1"
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          claimHighlight={{ color: '#FF0000' }}
        />
      );

      const cardElements = container.querySelectorAll('.card');
      cardElements.forEach(cardEl => {
        const card = cardEl as HTMLElement;
        expect(card.style.boxShadow).toContain('#FF0000');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty active cards array', () => {
      render(
        <GameBoard
          activeCards={[]}
          players={[createTestPlayer()]}
          currentPlayerId="player1"
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
        />
      );

      const cardButtons = screen.queryAllByRole('button');
      expect(cardButtons.length).toBe(0);
    });

    it('should handle unknown current player ID gracefully', () => {
      render(
        <GameBoard
          activeCards={createTestCards()}
          players={[createTestPlayer()]}
          currentPlayerId="unknown-player"
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
        />
      );

      // Should render without crashing
      expect(screen.getAllByRole('button').length).toBe(7);
    });
  });
});
