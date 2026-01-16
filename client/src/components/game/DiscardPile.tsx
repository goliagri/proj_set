/**
 * DiscardPile Component
 *
 * Displays a player's claimed cards as a pile with the top card visible.
 * Shows a random card from the last claimed set.
 */

import { CardInstance, CardDisplayMode } from '@projective-set/shared';
import { Card } from './Card';
import './DiscardPile.css';

interface DiscardPileProps {
  /** All cards in the discard pile */
  claimedCards: CardInstance[];
  /** Display mode for cards */
  displayMode?: CardDisplayMode;
  /** Optional label prefix (for multiplayer, e.g., "P1") */
  labelPrefix?: string;
}

export function DiscardPile({
  claimedCards,
  displayMode = 'standard',
  labelPrefix,
}: DiscardPileProps) {
  const cardCount = claimedCards.length;

  // Get the top card (last card in the array, which is most recently claimed)
  const topCard = cardCount > 0 ? claimedCards[claimedCards.length - 1] : null;

  return (
    <div className="discard-pile">
      <div className="discard-pile__label">
        {labelPrefix && <span className="discard-pile__prefix">{labelPrefix}</span>}
        {cardCount} cards found
      </div>
      <div className="discard-pile__stack">
        {topCard ? (
          <>
            {/* Shadow cards to show depth */}
            {cardCount > 2 && <div className="discard-pile__shadow discard-pile__shadow--deep" />}
            {cardCount > 1 && <div className="discard-pile__shadow" />}
            <Card
              card={topCard}
              displayMode={displayMode}
              isSelected={false}
            />
          </>
        ) : (
          <div className="discard-pile__empty">
            Empty
          </div>
        )}
      </div>
    </div>
  );
}
