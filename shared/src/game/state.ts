/**
 * Game State Management for Projective Set
 *
 * Pure functions for creating and updating game state.
 * These functions are side-effect free and can be used on both
 * client (for optimistic updates) and server (for authoritative state).
 */

import { CardInstance, CardId, ACTIVE_CARD_COUNT } from '../types/card';
import {
  GameState,
  Player,
  PlayerId,
  SinglePlayerSettings,
  MultiplayerSettings,
  DEFAULT_SINGLE_PLAYER_SETTINGS,
  DEFAULT_MULTIPLAYER_SETTINGS,
  ScoringMode,
} from '../types/game';
import { createShuffledDeck, dealCards, returnCardsToDeck } from './deck';
import { isValidSet, hasValidSet } from './validation';

// =============================================================================
// Game Initialization
// =============================================================================

/**
 * Create a new single-player game state.
 *
 * @param playerId - ID of the player
 * @param playerName - Display name of the player
 * @param settings - Game settings (uses defaults if not provided)
 * @returns Initial game state ready to play
 */
export function createSinglePlayerGame(
  playerId: PlayerId,
  playerName: string,
  settings: SinglePlayerSettings = DEFAULT_SINGLE_PLAYER_SETTINGS
): GameState {
  const deck = createShuffledDeck();
  const activeCards = dealCards(deck, ACTIVE_CARD_COUNT);

  const player: Player = {
    id: playerId,
    name: playerName,
    playerNumber: 1,
    color: '#3B82F6', // Blue
    claimedCards: [],
    selectedCardIds: [],
    score: 0,
    isConnected: true,
    isReady: true,
  };

  return {
    phase: 'playing',
    deck,
    activeCards,
    players: [player],
    settings,
    turnTimeRemainingMs: settings.turnTimer?.durationMs ?? null,
    gameTimeRemainingMs: settings.gameTimer?.durationMs ?? null,
    endReason: null,
    startedAt: Date.now(),
  };
}

/**
 * Create a new multiplayer game state from a lobby.
 *
 * @param players - Array of players from the lobby
 * @param settings - Game settings from the lobby
 * @returns Initial game state for multiplayer
 */
export function createMultiplayerGame(
  players: Player[],
  settings: MultiplayerSettings = DEFAULT_MULTIPLAYER_SETTINGS
): GameState {
  const deck = createShuffledDeck();
  const activeCards = dealCards(deck, ACTIVE_CARD_COUNT);

  // Reset player game state while preserving identity
  const gamePlayers = players.map((p, index) => ({
    ...p,
    claimedCards: [],
    selectedCardIds: [],
    score: 0,
    playerNumber: index + 1,
  }));

  return {
    phase: 'playing',
    deck,
    activeCards,
    players: gamePlayers,
    settings,
    turnTimeRemainingMs: settings.turnTimer?.durationMs ?? null,
    gameTimeRemainingMs: settings.gameTimer?.durationMs ?? null,
    endReason: null,
    startedAt: Date.now(),
  };
}

// =============================================================================
// Player Actions
// =============================================================================

/**
 * Toggle card selection for a player.
 *
 * @param state - Current game state
 * @param playerId - ID of the player selecting
 * @param cardId - ID of the card to toggle
 * @returns Updated game state
 */
export function toggleCardSelection(
  state: GameState,
  playerId: PlayerId,
  cardId: CardId
): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return state; // Player not found
  }

  // Verify card is on the table
  const cardExists = state.activeCards.some(c => c.id === cardId);
  if (!cardExists) {
    return state; // Card not on table
  }

  const player = state.players[playerIndex];
  const isSelected = player.selectedCardIds.includes(cardId);

  // Toggle the selection
  const newSelection = isSelected
    ? player.selectedCardIds.filter(id => id !== cardId)
    : [...player.selectedCardIds, cardId];

  // Update player's selection
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...player,
    selectedCardIds: newSelection,
  };

  return {
    ...state,
    players: newPlayers,
  };
}

/**
 * Get the card values for a player's current selection.
 *
 * @param state - Current game state
 * @param playerId - ID of the player
 * @returns Array of card values in selection order
 */
export function getSelectedCardValues(
  state: GameState,
  playerId: PlayerId
): number[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];

  return player.selectedCardIds
    .map(id => state.activeCards.find(c => c.id === id))
    .filter((c): c is CardInstance => c !== undefined)
    .map(c => c.value);
}

/**
 * Check if a player's current selection forms a valid set.
 *
 * @param state - Current game state
 * @param playerId - ID of the player to check
 * @returns true if the selection is a valid set
 */
export function isPlayerSelectionValid(
  state: GameState,
  playerId: PlayerId
): boolean {
  const cardValues = getSelectedCardValues(state, playerId);
  return isValidSet(cardValues);
}

/**
 * Claim a set for a player.
 * This removes the cards from the table, adds them to the player's pile,
 * and deals new cards.
 *
 * @param state - Current game state
 * @param playerId - ID of the claiming player
 * @param cardIds - IDs of cards to claim
 * @returns Object with new state and points awarded
 */
export function claimSet(
  state: GameState,
  playerId: PlayerId,
  cardIds: CardId[]
): { state: GameState; pointsAwarded: number } {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return { state, pointsAwarded: 0 };
  }

  // Get the card instances being claimed
  const claimedCards = cardIds
    .map(id => state.activeCards.find(c => c.id === id))
    .filter((c): c is CardInstance => c !== undefined);

  if (claimedCards.length !== cardIds.length) {
    return { state, pointsAwarded: 0 }; // Some cards not found
  }

  // Verify it's a valid set
  if (!isValidSet(claimedCards.map(c => c.value))) {
    return { state, pointsAwarded: 0 };
  }

  // Calculate points based on scoring mode
  const settings = state.settings as MultiplayerSettings;
  const scoringMode: ScoringMode = settings.scoringMode ?? 'cards';
  const pointsAwarded = scoringMode === 'cards' ? claimedCards.length : 1;

  // Remove claimed cards from active cards
  let newActiveCards = state.activeCards.filter(
    c => !cardIds.includes(c.id)
  );

  // Copy the deck for modification
  let newDeck = [...state.deck];

  // Handle infinite deck mode
  if (state.settings.infiniteDeck) {
    returnCardsToDeck(newDeck, claimedCards);
  }

  // Deal new cards to fill the table
  const cardsNeeded = ACTIVE_CARD_COUNT - newActiveCards.length;
  const newCards = dealCards(newDeck, cardsNeeded);
  newActiveCards = [...newActiveCards, ...newCards];

  // Update the claiming player
  const player = state.players[playerIndex];
  const newPlayers = state.players.map((p, i) => {
    if (i === playerIndex) {
      return {
        ...p,
        claimedCards: [...p.claimedCards, ...claimedCards],
        selectedCardIds: [],
        score: p.score + pointsAwarded,
      };
    }
    // Clear selections of cards that were just claimed for other players
    return {
      ...p,
      selectedCardIds: p.selectedCardIds.filter(id => !cardIds.includes(id)),
    };
  });

  // Reset turn timer if applicable
  const turnTimeRemainingMs = state.settings.turnTimer?.durationMs ?? null;

  return {
    state: {
      ...state,
      deck: newDeck,
      activeCards: newActiveCards,
      players: newPlayers,
      turnTimeRemainingMs,
    },
    pointsAwarded,
  };
}

/**
 * Clear a player's card selection.
 *
 * @param state - Current game state
 * @param playerId - ID of the player
 * @returns Updated game state
 */
export function clearSelection(
  state: GameState,
  playerId: PlayerId
): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return state;
  }

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    selectedCardIds: [],
  };

  return {
    ...state,
    players: newPlayers,
  };
}

// =============================================================================
// Game Flow
// =============================================================================

/**
 * Check if the game should end and return the end reason if so.
 *
 * @param state - Current game state
 * @returns End reason or null if game should continue
 */
export function checkGameEnd(
  state: GameState
): 'deck_empty' | 'timer_expired' | null {
  // Check timers
  if (
    state.gameTimeRemainingMs !== null &&
    state.gameTimeRemainingMs <= 0
  ) {
    return 'timer_expired';
  }

  if (
    state.turnTimeRemainingMs !== null &&
    state.turnTimeRemainingMs <= 0
  ) {
    return 'timer_expired';
  }

  // Check if deck is empty and no valid sets remain
  if (state.deck.length === 0 && !state.settings.infiniteDeck) {
    const activeValues = state.activeCards.map(c => c.value);
    if (!hasValidSet(activeValues)) {
      return 'deck_empty';
    }
  }

  return null;
}

/**
 * End the game with the given reason.
 *
 * @param state - Current game state
 * @param reason - Why the game ended
 * @returns Updated game state with ended phase
 */
export function endGame(
  state: GameState,
  reason: 'deck_empty' | 'timer_expired' | 'player_quit'
): GameState {
  return {
    ...state,
    phase: 'ended',
    endReason: reason,
  };
}

/**
 * Update timer values (called periodically by game loop).
 *
 * @param state - Current game state
 * @param elapsedMs - Milliseconds since last update
 * @returns Updated game state with new timer values
 */
export function updateTimers(state: GameState, elapsedMs: number): GameState {
  let turnTimeRemainingMs = state.turnTimeRemainingMs;
  let gameTimeRemainingMs = state.gameTimeRemainingMs;

  if (turnTimeRemainingMs !== null) {
    turnTimeRemainingMs = Math.max(0, turnTimeRemainingMs - elapsedMs);
  }

  if (gameTimeRemainingMs !== null) {
    gameTimeRemainingMs = Math.max(0, gameTimeRemainingMs - elapsedMs);
  }

  return {
    ...state,
    turnTimeRemainingMs,
    gameTimeRemainingMs,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the winner(s) of the game.
 * Returns array in case of tie.
 *
 * @param state - Ended game state
 * @returns Array of winning player(s)
 */
export function getWinners(state: GameState): Player[] {
  if (state.phase !== 'ended') {
    return [];
  }

  const maxScore = Math.max(...state.players.map(p => p.score));
  return state.players.filter(p => p.score === maxScore);
}

/**
 * Get a player by ID.
 *
 * @param state - Current game state
 * @param playerId - ID of the player to find
 * @returns Player or undefined if not found
 */
export function getPlayer(state: GameState, playerId: PlayerId): Player | undefined {
  return state.players.find(p => p.id === playerId);
}
