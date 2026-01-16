/**
 * Set Validation Logic for Projective Set
 *
 * Core game logic for determining if a selection of cards forms a valid set.
 * A valid set is any group of cards where XORing all values yields 0.
 * This means each bit position has an even count of 1s across all cards.
 *
 * Mathematical background:
 * - Cards are elements of the projective plane PG(2,2) (Fano plane)
 * - A "set" is a projective line (3 collinear points) or union of lines
 * - With 7 cards, at least one valid set always exists (guaranteed by geometry)
 */

import { Card } from '../types/card';

/**
 * Minimum number of cards required to form a valid set.
 * A single card XORs to itself (non-zero), two distinct cards XOR to non-zero,
 * so the minimum valid set size is 3.
 */
export const MIN_SET_SIZE = 3;

/**
 * Check if a collection of cards forms a valid set.
 *
 * A valid set is defined as a group of cards where the XOR of all card
 * values equals zero. This means each bit position (dot type) appears
 * an even number of times across all cards in the set.
 *
 * @param cards - Array of card values to check
 * @returns true if the cards form a valid set, false otherwise
 *
 * @example
 * // Binary: 010001, 000101, 010100 -> XOR = 000000 (valid)
 * isValidSet([17, 5, 20]) // returns true
 *
 * @example
 * // Must have at least 3 cards
 * isValidSet([17, 5]) // returns false
 */
export function isValidSet(cards: Card[]): boolean {
  // Need at least 3 cards to form a set
  if (cards.length < MIN_SET_SIZE) {
    return false;
  }

  // XOR all cards together - valid set XORs to 0
  const xorResult = cards.reduce((acc, card) => acc ^ card, 0);

  return xorResult === 0;
}

/**
 * Find all valid sets within a collection of cards.
 *
 * This is a brute-force search that checks all possible subsets.
 * For 7 cards, this is 2^7 - 1 = 127 subsets to check, which is fast.
 *
 * @param cards - Array of card values to search within
 * @returns Array of valid sets, where each set is an array of card indices
 *
 * @example
 * const cards = [17, 5, 20, 42, 31, 8, 63];
 * const sets = findAllSets(cards);
 * // sets[0] might be [0, 1, 2] meaning cards at indices 0, 1, 2 form a set
 */
export function findAllSets(cards: Card[]): number[][] {
  const validSets: number[][] = [];
  const n = cards.length;

  // Check all subsets using bitmask enumeration
  // Start from 7 (binary 111) to ensure at least 3 cards
  for (let mask = 7; mask < (1 << n); mask++) {
    // Count bits to ensure at least 3 cards in subset
    const bitCount = countBits(mask);
    if (bitCount < MIN_SET_SIZE) {
      continue;
    }

    // Extract the cards in this subset
    const subset: Card[] = [];
    const indices: number[] = [];

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subset.push(cards[i]);
        indices.push(i);
      }
    }

    // Check if this subset is a valid set
    if (isValidSet(subset)) {
      validSets.push(indices);
    }
  }

  return validSets;
}

/**
 * Check if there exists at least one valid set in the given cards.
 *
 * More efficient than findAllSets when you only need to know if a set exists.
 * Short-circuits on first valid set found.
 *
 * @param cards - Array of card values to search within
 * @returns true if at least one valid set exists
 */
export function hasValidSet(cards: Card[]): boolean {
  const n = cards.length;

  // With 7 cards, a set is guaranteed (Fano plane theorem)
  // But we still check in case fewer cards are present
  if (n < MIN_SET_SIZE) {
    return false;
  }

  // Check all subsets, return early on first valid set
  for (let mask = 7; mask < (1 << n); mask++) {
    if (countBits(mask) < MIN_SET_SIZE) {
      continue;
    }

    let xorResult = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        xorResult ^= cards[i];
      }
    }

    if (xorResult === 0) {
      return true;
    }
  }

  return false;
}

/**
 * Find the smallest valid set containing specific cards (if one exists).
 *
 * Useful for hinting or checking if a partial selection can become valid.
 *
 * @param cards - All available card values
 * @param requiredIndices - Indices of cards that must be in the set
 * @returns Indices of a valid set including required cards, or null if none exists
 */
export function findSetContaining(
  cards: Card[],
  requiredIndices: number[]
): number[] | null {
  const n = cards.length;

  // Build the required mask
  let requiredMask = 0;
  for (const idx of requiredIndices) {
    requiredMask |= (1 << idx);
  }

  const requiredCount = requiredIndices.length;

  // Check subsets that include all required cards, smallest first
  for (let size = Math.max(MIN_SET_SIZE, requiredCount); size <= n; size++) {
    for (let mask = requiredMask; mask < (1 << n); mask++) {
      // Skip if doesn't include all required cards
      if ((mask & requiredMask) !== requiredMask) {
        continue;
      }

      // Skip if wrong size
      if (countBits(mask) !== size) {
        continue;
      }

      // Check if valid
      let xorResult = 0;
      const indices: number[] = [];

      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          xorResult ^= cards[i];
          indices.push(i);
        }
      }

      if (xorResult === 0) {
        return indices;
      }
    }
  }

  return null;
}

/**
 * Count the number of 1 bits in a number (population count).
 *
 * @param n - Number to count bits in
 * @returns Number of 1 bits
 */
function countBits(n: number): number {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>>= 1;
  }
  return count;
}
