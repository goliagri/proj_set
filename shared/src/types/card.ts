/**
 * Card Types for Projective Set
 *
 * Each card is represented as a 6-bit number (1-63).
 * Each bit represents the presence of a dot in a specific position.
 * Card 0 (000000) does not exist in the deck.
 */

/**
 * A card is represented as a number from 1-63 (6-bit, excluding 0).
 * Each bit corresponds to a dot position on the card.
 *
 * Bit positions (0-5) map to visual dot positions:
 *   Bit 0 (LSB) -> Position 1 (e.g., top-left)
 *   Bit 1       -> Position 2
 *   Bit 2       -> Position 3
 *   Bit 3       -> Position 4
 *   Bit 4       -> Position 5
 *   Bit 5 (MSB) -> Position 6 (e.g., bottom-right)
 *
 * Example: Card 42 = 101010 in binary = dots at positions 2, 4, 6
 */
export type Card = number;

/**
 * Unique identifier for a card instance in a game.
 * While Card represents the card's value (1-63), CardId uniquely
 * identifies a specific card on the table or in a pile.
 */
export type CardId = string;

/**
 * A card instance combines the card value with a unique identifier.
 * This allows tracking specific cards as they move between zones.
 */
export interface CardInstance {
  id: CardId;
  value: Card;
}

/**
 * Visual representation mode for cards.
 */
export type CardDisplayMode = 'standard' | 'colorless' | 'binary';

/**
 * The total number of unique cards in a Projective Set deck.
 * This equals 2^6 - 1 = 63 (all 6-bit numbers except 0).
 */
export const DECK_SIZE = 63;

/**
 * Number of bits (dot positions) per card.
 */
export const BITS_PER_CARD = 6;

/**
 * Number of cards dealt face-up on the table.
 */
export const ACTIVE_CARD_COUNT = 7;
