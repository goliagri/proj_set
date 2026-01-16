/**
 * Deck Management for Projective Set
 *
 * Handles deck creation, shuffling, and dealing.
 * The deck consists of 63 unique cards (all 6-bit numbers except 0).
 */

import { Card, CardInstance, CardId, DECK_SIZE } from '../types/card';

/**
 * Generate a unique ID for a card instance.
 * Uses a combination of timestamp and random string for uniqueness.
 */
export function generateCardId(): CardId {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `card_${timestamp}_${random}`;
}

/**
 * Create a fresh, unshuffled deck of all 63 cards.
 *
 * @returns Array of CardInstances representing a complete deck
 */
export function createDeck(): CardInstance[] {
  const deck: CardInstance[] = [];

  // Create cards 1-63 (all non-zero 6-bit numbers)
  for (let value = 1; value <= DECK_SIZE; value++) {
    deck.push({
      id: generateCardId(),
      value: value as Card,
    });
  }

  return deck;
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm.
 *
 * @param array - Array to shuffle (modified in place)
 * @returns The same array, now shuffled
 */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Create a new shuffled deck.
 *
 * @returns A shuffled array of CardInstances
 */
export function createShuffledDeck(): CardInstance[] {
  return shuffle(createDeck());
}

/**
 * Deal cards from the deck.
 *
 * @param deck - The deck to deal from (modified in place)
 * @param count - Number of cards to deal
 * @returns Array of dealt CardInstances
 */
export function dealCards(deck: CardInstance[], count: number): CardInstance[] {
  const dealt: CardInstance[] = [];

  for (let i = 0; i < count && deck.length > 0; i++) {
    const card = deck.pop();
    if (card) {
      dealt.push(card);
    }
  }

  return dealt;
}

/**
 * Add cards back to the deck (for infinite mode).
 * Cards are shuffled back in randomly.
 *
 * @param deck - The deck to add cards to (modified in place)
 * @param cards - Cards to add back
 */
export function returnCardsToDeck(
  deck: CardInstance[],
  cards: CardInstance[]
): void {
  // Re-generate IDs for returned cards to ensure uniqueness
  const cardsWithNewIds = cards.map(card => ({
    id: generateCardId(),
    value: card.value,
  }));

  // Add to deck and shuffle
  deck.push(...cardsWithNewIds);
  shuffle(deck);
}

/**
 * Get the visual representation of a card's dots.
 *
 * @param value - The card value (1-63)
 * @returns Array of 6 booleans, true where a dot is present
 *
 * @example
 * getCardDots(42) // returns [false, true, false, true, false, true]
 * // Binary 42 = 101010, so dots at positions 1, 3, 5 (0-indexed)
 */
export function getCardDots(value: Card): boolean[] {
  const dots: boolean[] = [];

  for (let i = 0; i < 6; i++) {
    dots.push((value & (1 << i)) !== 0);
  }

  return dots;
}

/**
 * Get the binary string representation of a card.
 *
 * @param value - The card value (1-63)
 * @returns 6-character binary string (e.g., "101010")
 */
export function getCardBinary(value: Card): string {
  return value.toString(2).padStart(6, '0');
}
