/**
 * Tests for Set Validation Logic
 *
 * Tests the core game rules: XOR-based set validation.
 */

import { describe, it, expect } from 'vitest';
import {
  isValidSet,
  findAllSets,
  hasValidSet,
  findSetContaining,
  MIN_SET_SIZE,
} from './validation';

describe('isValidSet', () => {
  describe('valid sets', () => {
    it('should return true for a valid 3-card set (XOR = 0)', () => {
      // Binary: 010001 (17) + 000101 (5) + 010100 (20) = 000000
      expect(isValidSet([17, 5, 20])).toBe(true);
    });

    it('should return true for another valid 3-card set', () => {
      // Binary: 111000 (56) + 000111 (7) + 111111 (63) = 000000
      expect(isValidSet([56, 7, 63])).toBe(true);
    });

    it('should return true for a valid 4-card set', () => {
      // 1 ^ 2 ^ 4 ^ 7 = 001 ^ 010 ^ 100 ^ 111 = 000
      expect(isValidSet([1, 2, 4, 7])).toBe(true);
    });

    it('should return true for same card repeated even times (edge case)', () => {
      // 5 ^ 5 ^ 3 ^ 3 = 0 (each appears twice)
      expect(isValidSet([5, 5, 3, 3])).toBe(true);
    });

    it('should return true for all zeros effectively (pairs)', () => {
      // 1 ^ 1 ^ 2 ^ 2 ^ 3 ^ 3 = 0
      expect(isValidSet([1, 1, 2, 2, 3, 3])).toBe(true);
    });
  });

  describe('invalid sets', () => {
    it('should return false for less than 3 cards', () => {
      expect(isValidSet([])).toBe(false);
      expect(isValidSet([1])).toBe(false);
      expect(isValidSet([1, 2])).toBe(false);
    });

    it('should return false for 3 cards that do not XOR to 0', () => {
      // Binary: 010001 (17) + 000101 (5) + 001010 (10) = 011110 (30) != 0
      expect(isValidSet([17, 5, 10])).toBe(false);
    });

    it('should return false for cards that do not XOR to 0', () => {
      // 4 ^ 5 ^ 6 = 100 ^ 101 ^ 110 = 111 = 7 != 0
      expect(isValidSet([4, 5, 6])).toBe(false);
      // 1 ^ 4 ^ 16 = single bits that don't cancel
      expect(isValidSet([1, 4, 16])).toBe(false);
    });

    it('should return false for 4 cards that do not XOR to 0', () => {
      // 1 ^ 2 ^ 3 ^ 4 = 001 ^ 010 ^ 011 ^ 100 = 100 = 4 != 0
      expect(isValidSet([1, 2, 3, 4])).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle maximum card value (63)', () => {
      // 63 = 111111, need to find partners
      // 63 ^ 63 ^ anything = anything, so need specific values
      // 21 = 010101, 42 = 101010, 63 = 111111 -> XOR = 000000
      expect(isValidSet([21, 42, 63])).toBe(true);
    });

    it('should handle minimum card value (1)', () => {
      // 1 ^ 2 ^ 3 = 001 ^ 010 ^ 011 = 000 (XOR cancels out)
      // This IS a valid set
      expect(isValidSet([1, 2, 3])).toBe(true);
    });
  });
});

describe('findAllSets', () => {
  it('should find no sets in an empty array', () => {
    expect(findAllSets([])).toEqual([]);
  });

  it('should find no sets with fewer than 3 cards', () => {
    expect(findAllSets([1])).toEqual([]);
    expect(findAllSets([1, 2])).toEqual([]);
  });

  it('should find exactly one set when only one exists', () => {
    const cards = [17, 5, 20]; // Known valid set
    const sets = findAllSets(cards);
    expect(sets.length).toBe(1);
    expect(sets[0]).toEqual([0, 1, 2]);
  });

  it('should find multiple sets when they exist', () => {
    // Cards that form multiple sets
    const cards = [1, 2, 3, 4, 5, 6, 7];
    const sets = findAllSets(cards);
    expect(sets.length).toBeGreaterThan(0);

    // Verify each found set is actually valid
    for (const setIndices of sets) {
      const cardValues = setIndices.map(i => cards[i]);
      expect(isValidSet(cardValues)).toBe(true);
    }
  });

  it('should include all valid subsets of any size >= 3', () => {
    // 1, 2, 3 form a set (XOR = 0)
    // 1, 2, 3, 4, 5, 6, 7 also forms a set if XOR = 0
    const cards = [1, 2, 3];
    const sets = findAllSets(cards);
    expect(sets).toContainEqual([0, 1, 2]);
  });

  it('should return indices, not values', () => {
    const cards = [17, 5, 20];
    const sets = findAllSets(cards);
    // Should return indices [0,1,2], not values [17,5,20]
    expect(sets[0].every(i => typeof i === 'number' && i < cards.length)).toBe(true);
  });
});

describe('hasValidSet', () => {
  it('should return false for fewer than 3 cards', () => {
    expect(hasValidSet([])).toBe(false);
    expect(hasValidSet([1])).toBe(false);
    expect(hasValidSet([1, 2])).toBe(false);
  });

  it('should return true when a valid set exists', () => {
    expect(hasValidSet([17, 5, 20])).toBe(true);
  });

  it('should return false when no valid set exists', () => {
    // Need 3 cards where no subset forms a valid set
    // This is tricky - let's use cards that don't XOR to 0
    // 1, 4, 16 are powers of 2 with single bits
    // 1^4 = 5, 1^16 = 17, 4^16 = 20, 1^4^16 = 21
    // None of these are 0, so no 3-card set
    expect(hasValidSet([1, 4, 16])).toBe(false);
  });

  it('should find a set among 7 cards (Fano plane guarantee)', () => {
    // With 7 specific cards forming the Fano plane, there's always a set
    // Using cards 1-7 which form multiple sets
    expect(hasValidSet([1, 2, 3, 4, 5, 6, 7])).toBe(true);
  });

  it('should return consistent results with findAllSets', () => {
    const testCases = [
      [1, 2, 3],
      [1, 4, 16],
      [17, 5, 20],
      [1, 2, 3, 4, 5, 6, 7],
    ];

    for (const cards of testCases) {
      const hasSet = hasValidSet(cards);
      const allSets = findAllSets(cards);
      expect(hasSet).toBe(allSets.length > 0);
    }
  });
});

describe('findSetContaining', () => {
  it('should return null when no set contains required cards', () => {
    // 1, 4, 16 don't form a set among themselves or with each other
    const cards = [1, 4, 16];
    expect(findSetContaining(cards, [0, 1])).toBe(null);
  });

  it('should find a set containing specific cards', () => {
    const cards = [17, 5, 20, 1, 2];
    // Cards at indices 0,1,2 form a valid set
    const result = findSetContaining(cards, [0]);
    expect(result).not.toBe(null);
    if (result) {
      expect(result).toContain(0);
      const cardValues = result.map(i => cards[i]);
      expect(isValidSet(cardValues)).toBe(true);
    }
  });

  it('should find the smallest valid set', () => {
    const cards = [17, 5, 20, 1, 2, 3];
    // Should find [0,1,2] (size 3) before any larger sets
    const result = findSetContaining(cards, [0]);
    expect(result).not.toBe(null);
    if (result) {
      expect(result.length).toBe(MIN_SET_SIZE);
    }
  });

  it('should return the required cards plus others needed', () => {
    const cards = [17, 5, 20];
    const result = findSetContaining(cards, [0, 1]);
    expect(result).not.toBe(null);
    if (result) {
      expect(result).toContain(0);
      expect(result).toContain(1);
      expect(result).toContain(2); // Third card needed to complete set
    }
  });

  it('should handle empty required indices', () => {
    const cards = [17, 5, 20];
    const result = findSetContaining(cards, []);
    // Should find any valid set
    expect(result).not.toBe(null);
    if (result) {
      const cardValues = result.map(i => cards[i]);
      expect(isValidSet(cardValues)).toBe(true);
    }
  });
});

describe('MIN_SET_SIZE constant', () => {
  it('should be 3', () => {
    expect(MIN_SET_SIZE).toBe(3);
  });
});

describe('mathematical properties', () => {
  it('should satisfy XOR commutativity (order does not matter)', () => {
    const cards = [17, 5, 20];
    expect(isValidSet([17, 5, 20])).toBe(isValidSet([5, 17, 20]));
    expect(isValidSet([17, 5, 20])).toBe(isValidSet([20, 5, 17]));
  });

  it('should correctly identify sets where each bit appears even times', () => {
    // Card values where bit position 0 appears exactly twice
    // 1 = 000001, 3 = 000011, 2 = 000010
    // Bit 0: 1,3 have it (2 times) - even
    // Bit 1: 3,2 have it (2 times) - even
    // XOR: 1^3^2 = 001^011^010 = 000 ✓
    expect(isValidSet([1, 3, 2])).toBe(true);
  });
});
