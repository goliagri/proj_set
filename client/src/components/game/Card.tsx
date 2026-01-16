/**
 * Card Component
 *
 * Renders a single Projective Set card.
 * Supports multiple display modes: standard (colored dots), colorless, and binary.
 */

import { CardInstance, CardDisplayMode, getCardDots, getCardBinary } from '@projective-set/shared';
import './Card.css';

/**
 * Colors for each dot position (0-5).
 * These are visually distinct and colorblind-friendly.
 */
const DOT_COLORS = [
  '#ff0000', // Red - bright pure red
  '#ff8533', // Orange - lighter
  '#ffee00', // Yellow - bright
  '#157347', // Green - forest green
  '#0040ff', // Blue - deep royal blue
  '#4b0082', // Purple - dark indigo
];

interface CardProps {
  /** The card data to display */
  card: CardInstance;
  /** Display mode for the card */
  displayMode?: CardDisplayMode;
  /** Whether the card is currently selected */
  isSelected?: boolean;
  /** Color of the selection highlight (for multiplayer) */
  selectionColor?: string;
  /** Whether this is a "pending" set (valid, waiting for confirmation) */
  isPending?: boolean;
  /** Colors of other players who have this card selected (for subtle glow) */
  otherPlayerColors?: string[];
  /** Color for claim highlight (bright outline when someone just claimed a set) */
  claimHighlightColor?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Renders a card with dots or binary representation.
 */
export function Card({
  card,
  displayMode = 'standard',
  isSelected = false,
  selectionColor,
  isPending = false,
  otherPlayerColors = [],
  claimHighlightColor,
  onClick,
}: CardProps) {
  const dots = getCardDots(card.value);
  const binary = getCardBinary(card.value);

  // Determine classes
  const classes = ['card'];
  if (isSelected) classes.push('card--selected');

  // Build style for visual effects
  // Must include the base shadow since inline style overrides CSS
  const cardStyle: React.CSSProperties = {};

  // Priority 1: Claim highlight (bright, prominent but tight)
  if (claimHighlightColor) {
    cardStyle.boxShadow = `
      0 4px 6px rgba(0, 0, 0, 0.3),
      0 0 0 3px ${claimHighlightColor}90,
      0 0 8px 2px ${claimHighlightColor}60
    `;
  }
  // Priority 2: Other player selection glow (shows even when user has card selected)
  else if (otherPlayerColors.length > 0) {
    const color = otherPlayerColors[0];
    cardStyle.boxShadow = `
      0 4px 6px rgba(0, 0, 0, 0.3),
      0 0 0 2px ${color}70,
      0 0 6px 1px ${color}50
    `;
  }

  return (
    <div
      className={classes.join(' ')}
      style={cardStyle}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Card content */}
      <div className="card__content">
        {displayMode === 'binary' ? (
          // Binary mode: show 6-digit binary number
          <div className="card__binary">{binary}</div>
        ) : (
          // Dot mode: show colored or grey dots
          <div className="card__dots">
            {dots.map((hasDot, index) => (
              <div
                key={index}
                className={`card__dot-slot ${hasDot ? 'card__dot-slot--filled' : ''}`}
              >
                {hasDot && (
                  <div
                    className="card__dot"
                    style={{
                      backgroundColor:
                        displayMode === 'colorless' ? '#888888' : DOT_COLORS[index],
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
