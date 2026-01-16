/**
 * GameBoard Component
 *
 * Displays the main game area:
 * - 2x4 grid of active cards
 * - Deck (card back with count)
 * - Player's discard pile
 */

import { CardInstance, Player, SinglePlayerSettings, CardDisplayMode } from '@projective-set/shared';
import { Card } from './Card';
import './GameBoard.css';

interface GameBoardProps {
  /** Cards currently on the table */
  activeCards: CardInstance[];
  /** All players in the game */
  players: Player[];
  /** The current user's player ID */
  currentPlayerId: string;
  /** Game settings */
  settings: SinglePlayerSettings;
  /** Number of cards remaining in deck */
  deckCount?: number;
  /** Active claim highlight (when someone just claimed a set) */
  claimHighlight?: { color: string };
  /** Handler for card clicks (multiplayer uses this) */
  onCardClick?: (cardId: string) => void;
  /** Handler for confirming a set (click mode) */
  onConfirmSet?: () => void;
}

/**
 * Determines the display mode based on settings.
 */
function getDisplayMode(settings: SinglePlayerSettings): CardDisplayMode {
  if (settings.binaryMode) return 'binary';
  if (!settings.colorsEnabled) return 'colorless';
  return 'standard';
}

/**
 * Main game board component.
 */
export function GameBoard({
  activeCards,
  players,
  currentPlayerId,
  settings,
  deckCount,
  claimHighlight,
  onCardClick,
  onConfirmSet,
}: GameBoardProps) {
  const displayMode = getDisplayMode(settings);
  const currentPlayer = players.find(p => p.id === currentPlayerId);

  // Build a map of cardId -> selecting players for multiplayer indicators
  const cardSelections = new Map<string, Player[]>();
  for (const player of players) {
    for (const cardId of player.selectedCardIds) {
      const existing = cardSelections.get(cardId) || [];
      existing.push(player);
      cardSelections.set(cardId, existing);
    }
  }

  // Check if current player has a valid set selected
  const currentSelection = currentPlayer?.selectedCardIds || [];
  const isPendingSet = currentSelection.length >= 3; // TODO: Actually check validity

  return (
    <div className="game-board">
      {/* Deck counter above cards */}
      {deckCount !== undefined && (
        <div className="deck-counter">
          {deckCount} cards left in deck
        </div>
      )}

      {/* Card grid (2x4) */}
      <div className="card-grid">
        {/* Render only actual cards */}
        {activeCards.map((card) => {
          const selectingPlayers = cardSelections.get(card.id) || [];
          const isSelectedByMe = currentSelection.includes(card.id);
          // Get other players who selected this card (for subtle glow)
          const otherSelectors = selectingPlayers.filter(p => p.id !== currentPlayerId);

          return (
            <Card
              key={card.id}
              card={card}
              displayMode={displayMode}
              isSelected={isSelectedByMe}
              selectionColor={isSelectedByMe ? currentPlayer?.color : undefined}
              isPending={isSelectedByMe && isPendingSet}
              otherPlayerColors={otherSelectors.map(p => p.color)}
              claimHighlightColor={claimHighlight?.color}
              onClick={() => onCardClick?.(card.id)}
            />
          );
        })}
      </div>

      {/* Confirm button for click mode */}
      {settings.setFoundBehavior === 'click' && isPendingSet && (
        <button
          className="btn btn-primary confirm-set-btn"
          onClick={onConfirmSet}
        >
          Claim Set
        </button>
      )}
    </div>
  );
}
