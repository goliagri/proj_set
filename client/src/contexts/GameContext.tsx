/**
 * Game Context
 *
 * Manages game state for both single-player and multiplayer modes.
 * Provides actions for card selection and set claiming.
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import {
  GameState,
  CardId,
  toggleCardSelection,
  isPlayerSelectionValid,
  claimSet,
  clearSelection,
  checkGameEnd,
  endGame,
  createSinglePlayerGame,
  SinglePlayerSettings,
} from '@projective-set/shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Actions that can modify game state.
 */
type GameAction =
  | { type: 'SET_STATE'; payload: GameState }
  | { type: 'TOGGLE_CARD'; payload: { playerId: string; cardId: CardId } }
  | { type: 'CLAIM_SET'; payload: { playerId: string; cardIds: CardId[] } }
  | { type: 'CLEAR_SELECTION'; payload: { playerId: string } }
  | { type: 'UPDATE_TIMERS'; payload: { turnTimeRemainingMs: number | null; gameTimeRemainingMs: number | null } }
  | { type: 'END_GAME'; payload: { reason: 'deck_empty' | 'timer_expired' | 'player_quit' } }
  | { type: 'RESET' };

/**
 * Context value provided to consumers.
 */
interface GameContextValue {
  /** Current game state (null if no game active) */
  state: GameState | null;
  /** Start a new single-player game */
  startSinglePlayer: (playerName: string, settings: SinglePlayerSettings) => void;
  /** Set game state (for multiplayer sync) */
  setGameState: (state: GameState) => void;
  /** Toggle card selection for a player */
  toggleCard: (playerId: string, cardId: CardId) => boolean;
  /** Check if current selection is a valid set */
  isSelectionValid: (playerId: string) => boolean;
  /** Claim a set (for single-player or local validation) */
  claimSetAction: (playerId: string, cardIds: CardId[]) => void;
  /** Clear player's selection */
  clearSelectionAction: (playerId: string) => void;
  /** Update timer values */
  updateTimers: (turnTime: number | null, gameTime: number | null) => void;
  /** End the game */
  endGameAction: (reason: 'deck_empty' | 'timer_expired' | 'player_quit') => void;
  /** Reset game state */
  reset: () => void;
}

// =============================================================================
// Reducer
// =============================================================================

/**
 * Reducer for game state updates.
 * Uses pure functions from shared module for state transitions.
 */
function gameReducer(state: GameState | null, action: GameAction): GameState | null {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;

    case 'TOGGLE_CARD': {
      if (!state) return null;
      return toggleCardSelection(state, action.payload.playerId, action.payload.cardId);
    }

    case 'CLAIM_SET': {
      if (!state) return null;
      const result = claimSet(state, action.payload.playerId, action.payload.cardIds);
      let newState = result.state;

      // Check for game end after claiming
      const endReason = checkGameEnd(newState);
      if (endReason) {
        newState = endGame(newState, endReason);
      }

      return newState;
    }

    case 'CLEAR_SELECTION': {
      if (!state) return null;
      return clearSelection(state, action.payload.playerId);
    }

    case 'UPDATE_TIMERS': {
      if (!state) return null;
      return {
        ...state,
        turnTimeRemainingMs: action.payload.turnTimeRemainingMs,
        gameTimeRemainingMs: action.payload.gameTimeRemainingMs,
      };
    }

    case 'END_GAME': {
      if (!state) return null;
      return endGame(state, action.payload.reason);
    }

    case 'RESET':
      return null;

    default:
      return state;
  }
}

// =============================================================================
// Context
// =============================================================================

const GameContext = createContext<GameContextValue | null>(null);

/**
 * Provider component for game state.
 */
export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null);

  // Start a new single-player game
  const startSinglePlayer = useCallback(
    (playerName: string, settings: SinglePlayerSettings) => {
      const playerId = `local_${Date.now()}`;
      const gameState = createSinglePlayerGame(playerId, playerName, settings);
      dispatch({ type: 'SET_STATE', payload: gameState });
    },
    []
  );

  // Set game state directly (for multiplayer sync)
  const setGameState = useCallback((gameState: GameState) => {
    dispatch({ type: 'SET_STATE', payload: gameState });
  }, []);

  // Toggle card selection
  const toggleCard = useCallback(
    (playerId: string, cardId: CardId): boolean => {
      dispatch({ type: 'TOGGLE_CARD', payload: { playerId, cardId } });
      // Return whether the new selection is valid
      // Note: This is slightly inefficient as we compute twice
      // but keeps the reducer pure
      if (!state) return false;
      const newState = toggleCardSelection(state, playerId, cardId);
      return isPlayerSelectionValid(newState, playerId);
    },
    [state]
  );

  // Check if selection is valid
  const isSelectionValid = useCallback(
    (playerId: string): boolean => {
      if (!state) return false;
      return isPlayerSelectionValid(state, playerId);
    },
    [state]
  );

  // Claim a set
  const claimSetAction = useCallback(
    (playerId: string, cardIds: CardId[]) => {
      dispatch({ type: 'CLAIM_SET', payload: { playerId, cardIds } });
    },
    []
  );

  // Clear selection
  const clearSelectionAction = useCallback((playerId: string) => {
    dispatch({ type: 'CLEAR_SELECTION', payload: { playerId } });
  }, []);

  // Update timers
  const updateTimers = useCallback(
    (turnTime: number | null, gameTime: number | null) => {
      dispatch({
        type: 'UPDATE_TIMERS',
        payload: { turnTimeRemainingMs: turnTime, gameTimeRemainingMs: gameTime },
      });
    },
    []
  );

  // End game
  const endGameAction = useCallback(
    (reason: 'deck_empty' | 'timer_expired' | 'player_quit') => {
      dispatch({ type: 'END_GAME', payload: { reason } });
    },
    []
  );

  // Reset
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value: GameContextValue = {
    state,
    startSinglePlayer,
    setGameState,
    toggleCard,
    isSelectionValid,
    claimSetAction,
    clearSelectionAction,
    updateTimers,
    endGameAction,
    reset,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/**
 * Hook to access game context.
 */
export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
