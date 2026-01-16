/**
 * Projective Set - Shared Module
 *
 * This module contains all shared code between client and server:
 * - Type definitions for game state, events, and cards
 * - Pure game logic functions (validation, deck management, state updates)
 *
 * Usage:
 *   import { isValidSet, GameState, Card } from '@projective-set/shared';
 */

// Export all types
export * from './types';

// Export all game logic
export * from './game';
