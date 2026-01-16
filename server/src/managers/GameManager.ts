/**
 * Game Manager
 *
 * Manages active game instances and their state.
 * Handles card selection, set claiming, and game loop for timers.
 */

import {
  GameState,
  CardId,
  ErrorCodes,
  toggleCardSelection,
  isPlayerSelectionValid,
  claimSet,
  clearSelection,
  checkGameEnd,
  endGame,
  updateTimers,
  getSelectedCardValues,
} from '@projective-set/shared';
import { config } from '../config';

/**
 * Result type for operations that can fail.
 */
type Result<T> = T | { error: string; message: string };

/**
 * Pending set information (for click-to-confirm mode).
 */
interface PendingSet {
  playerId: string;
  cardIds: CardId[];
  timestamp: number;
}

/**
 * Active game instance with its state and metadata.
 */
interface GameInstance {
  state: GameState;
  pendingSet: PendingSet | null;
  loopInterval: NodeJS.Timeout | null;
}

/**
 * Manages all active game instances.
 */
class GameManager {
  /** Map of lobby code -> game instance */
  private games = new Map<string, GameInstance>();

  /**
   * Create a new game instance.
   *
   * @param lobbyCode - The lobby code to associate with this game
   * @param initialState - The initial game state
   */
  createGame(lobbyCode: string, initialState: GameState): void {
    this.games.set(lobbyCode, {
      state: initialState,
      pendingSet: null,
      loopInterval: null,
    });
  }

  /**
   * Get the current game state for a lobby.
   */
  getGameState(lobbyCode: string): GameState | undefined {
    return this.games.get(lobbyCode)?.state;
  }

  /**
   * Toggle card selection for a player.
   *
   * @param lobbyCode - The lobby code
   * @param playerId - The player selecting
   * @param cardId - The card to toggle
   * @returns The player's new selection and whether it forms a valid set
   */
  toggleCard(
    lobbyCode: string,
    playerId: string,
    cardId: CardId
  ): Result<{ selectedCardIds: CardId[]; validSetFormed: boolean }> {
    const game = this.games.get(lobbyCode);

    if (!game) {
      return { error: ErrorCodes.GAME_NOT_STARTED, message: 'Game not found' };
    }

    if (game.state.phase !== 'playing') {
      return { error: ErrorCodes.GAME_NOT_STARTED, message: 'Game is not active' };
    }

    // Note: We don't block selection based on pendingSet anymore.
    // Multiple players can select the same cards simultaneously.
    // The first to complete a valid set wins.

    // Update state
    game.state = toggleCardSelection(game.state, playerId, cardId);

    // Get the player's new selection
    const player = game.state.players.find(p => p.id === playerId);
    if (!player) {
      return { error: ErrorCodes.INVALID_REQUEST, message: 'Player not found' };
    }

    // Check if selection forms a valid set
    const validSetFormed = isPlayerSelectionValid(game.state, playerId);

    return {
      selectedCardIds: player.selectedCardIds,
      validSetFormed,
    };
  }

  /**
   * Mark a set as pending (for click-to-confirm mode).
   * The first player to form a valid set gets priority.
   */
  setPendingSet(lobbyCode: string, playerId: string, cardIds: CardId[]): void {
    const game = this.games.get(lobbyCode);
    if (!game) return;

    // Only set pending if no one else has it pending
    if (!game.pendingSet) {
      game.pendingSet = {
        playerId,
        cardIds,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Confirm and claim a pending set.
   *
   * @param lobbyCode - The lobby code
   * @param playerId - The player confirming
   * @returns The claimed cards and points, or error
   */
  confirmSet(
    lobbyCode: string,
    playerId: string
  ): Result<{
    claimedCardIds: CardId[];
    pointsAwarded: number;
    newCards: { id: CardId; value: number }[];
    gameEnded: boolean;
  }> {
    const game = this.games.get(lobbyCode);

    if (!game) {
      return { error: ErrorCodes.GAME_NOT_STARTED, message: 'Game not found' };
    }

    // Verify this player has the pending set
    if (!game.pendingSet || game.pendingSet.playerId !== playerId) {
      return { error: ErrorCodes.NO_PENDING_SET, message: 'No pending set to confirm' };
    }

    const cardIds = game.pendingSet.cardIds;

    // Claim the set
    const result = this.claimSet(lobbyCode, playerId, cardIds);
    if ('error' in result) {
      return result;
    }

    // Clear pending set
    game.pendingSet = null;

    return result;
  }

  /**
   * Claim a set immediately (for immediate mode or after confirmation).
   */
  claimSet(
    lobbyCode: string,
    playerId: string,
    cardIds: CardId[]
  ): Result<{
    claimedCardIds: CardId[];
    pointsAwarded: number;
    newCards: { id: CardId; value: number }[];
    gameEnded: boolean;
  }> {
    const game = this.games.get(lobbyCode);

    if (!game) {
      return { error: ErrorCodes.GAME_NOT_STARTED, message: 'Game not found' };
    }

    // Get cards before claiming (for return value)
    const activeCardsBefore = game.state.activeCards.map(c => c.id);

    // Claim the set
    const claimResult = claimSet(game.state, playerId, cardIds);

    if (claimResult.pointsAwarded === 0) {
      return { error: ErrorCodes.NOT_A_VALID_SET, message: 'Not a valid set' };
    }

    game.state = claimResult.state;

    // Find newly dealt cards
    const newCards = game.state.activeCards
      .filter(c => !activeCardsBefore.includes(c.id))
      .map(c => ({ id: c.id, value: c.value }));

    // Check for game end
    const endReason = checkGameEnd(game.state);
    let gameEnded = false;

    if (endReason) {
      game.state = endGame(game.state, endReason);
      gameEnded = true;
      this.stopGameLoop(lobbyCode);
    }

    return {
      claimedCardIds: cardIds,
      pointsAwarded: claimResult.pointsAwarded,
      newCards,
      gameEnded,
    };
  }

  /**
   * Clear a player's selection.
   */
  clearSelection(lobbyCode: string, playerId: string): Result<{ success: true }> {
    const game = this.games.get(lobbyCode);

    if (!game) {
      return { error: ErrorCodes.GAME_NOT_STARTED, message: 'Game not found' };
    }

    game.state = clearSelection(game.state, playerId);

    // Clear pending set if this player had one
    if (game.pendingSet?.playerId === playerId) {
      game.pendingSet = null;
    }

    return { success: true };
  }

  /**
   * Start the game loop for timer updates.
   *
   * @param lobbyCode - The lobby code
   * @param onTick - Called on each timer tick with current state
   * @param onEnd - Called when game ends due to timer
   */
  startGameLoop(
    lobbyCode: string,
    onTick: (state: GameState) => void,
    onEnd: (state: GameState) => void
  ): void {
    const game = this.games.get(lobbyCode);
    if (!game) return;

    let lastTick = Date.now();

    game.loopInterval = setInterval(() => {
      if (!game || game.state.phase !== 'playing') {
        this.stopGameLoop(lobbyCode);
        return;
      }

      const now = Date.now();
      const elapsed = now - lastTick;
      lastTick = now;

      // Update timers
      game.state = updateTimers(game.state, elapsed);

      // Check for game end
      const endReason = checkGameEnd(game.state);
      if (endReason) {
        game.state = endGame(game.state, endReason);
        this.stopGameLoop(lobbyCode);
        onEnd(game.state);
      } else {
        onTick(game.state);
      }
    }, config.tickRateMs);
  }

  /**
   * Stop the game loop for a lobby.
   */
  stopGameLoop(lobbyCode: string): void {
    const game = this.games.get(lobbyCode);
    if (game?.loopInterval) {
      clearInterval(game.loopInterval);
      game.loopInterval = null;
    }
  }

  /**
   * End a game and clean up.
   */
  endGame(lobbyCode: string): void {
    this.stopGameLoop(lobbyCode);
    this.games.delete(lobbyCode);
  }
}

// Export singleton instance
export const gameManager = new GameManager();
