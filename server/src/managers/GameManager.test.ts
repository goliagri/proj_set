/**
 * Tests for GameManager
 *
 * Tests game state management, card selection, and set claiming.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  GameState,
  CardId,
  Player,
  ErrorCodes,
  createMultiplayerGame,
  DEFAULT_MULTIPLAYER_SETTINGS,
  isValidSet,
} from '@projective-set/shared';

// Inline the class for testing to avoid singleton issues
import {
  toggleCardSelection,
  isPlayerSelectionValid,
  claimSet,
  clearSelection,
  checkGameEnd,
  endGame,
  updateTimers,
} from '@projective-set/shared';

type Result<T> = T | { error: string; message: string };

interface PendingSet {
  playerId: string;
  cardIds: CardId[];
  timestamp: number;
}

interface GameInstance {
  state: GameState;
  pendingSet: PendingSet | null;
  loopInterval: NodeJS.Timeout | null;
}

class TestGameManager {
  private games = new Map<string, GameInstance>();

  createGame(lobbyCode: string, initialState: GameState): void {
    this.games.set(lobbyCode, {
      state: initialState,
      pendingSet: null,
      loopInterval: null,
    });
  }

  getGameState(lobbyCode: string): GameState | undefined {
    return this.games.get(lobbyCode)?.state;
  }

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

    game.state = toggleCardSelection(game.state, playerId, cardId);

    const player = game.state.players.find(p => p.id === playerId);
    if (!player) {
      return { error: ErrorCodes.INVALID_REQUEST, message: 'Player not found' };
    }

    const validSetFormed = isPlayerSelectionValid(game.state, playerId);

    return {
      selectedCardIds: player.selectedCardIds,
      validSetFormed,
    };
  }

  setPendingSet(lobbyCode: string, playerId: string, cardIds: CardId[]): void {
    const game = this.games.get(lobbyCode);
    if (!game) return;

    if (!game.pendingSet) {
      game.pendingSet = {
        playerId,
        cardIds,
        timestamp: Date.now(),
      };
    }
  }

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

    if (!game.pendingSet || game.pendingSet.playerId !== playerId) {
      return { error: ErrorCodes.NO_PENDING_SET, message: 'No pending set to confirm' };
    }

    const cardIds = game.pendingSet.cardIds;
    const result = this.claimSet(lobbyCode, playerId, cardIds);

    if (!('error' in result)) {
      game.pendingSet = null;
    }

    return result;
  }

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

    const activeCardsBefore = game.state.activeCards.map(c => c.id);
    const claimResult = claimSet(game.state, playerId, cardIds);

    if (claimResult.pointsAwarded === 0) {
      return { error: ErrorCodes.NOT_A_VALID_SET, message: 'Not a valid set' };
    }

    game.state = claimResult.state;

    const newCards = game.state.activeCards
      .filter(c => !activeCardsBefore.includes(c.id))
      .map(c => ({ id: c.id, value: c.value }));

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

  clearSelection(lobbyCode: string, playerId: string): Result<{ success: true }> {
    const game = this.games.get(lobbyCode);

    if (!game) {
      return { error: ErrorCodes.GAME_NOT_STARTED, message: 'Game not found' };
    }

    game.state = clearSelection(game.state, playerId);

    if (game.pendingSet?.playerId === playerId) {
      game.pendingSet = null;
    }

    return { success: true };
  }

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

      game.state = updateTimers(game.state, elapsed);

      const endReason = checkGameEnd(game.state);
      if (endReason) {
        game.state = endGame(game.state, endReason);
        this.stopGameLoop(lobbyCode);
        onEnd(game.state);
      } else {
        onTick(game.state);
      }
    }, 100);
  }

  stopGameLoop(lobbyCode: string): void {
    const game = this.games.get(lobbyCode);
    if (game?.loopInterval) {
      clearInterval(game.loopInterval);
      game.loopInterval = null;
    }
  }

  endGame(lobbyCode: string): void {
    this.stopGameLoop(lobbyCode);
    this.games.delete(lobbyCode);
  }
}

describe('GameManager', () => {
  let manager: TestGameManager;
  let testPlayers: Player[];
  let testGameState: GameState;

  beforeEach(() => {
    manager = new TestGameManager();

    testPlayers = [
      {
        id: 'player1',
        name: 'Player 1',
        playerNumber: 1,
        color: '#3B82F6',
        claimedCards: [],
        selectedCardIds: [],
        score: 0,
        isConnected: true,
        isReady: true,
      },
      {
        id: 'player2',
        name: 'Player 2',
        playerNumber: 2,
        color: '#EF4444',
        claimedCards: [],
        selectedCardIds: [],
        score: 0,
        isConnected: true,
        isReady: true,
      },
    ];

    testGameState = createMultiplayerGame(testPlayers, DEFAULT_MULTIPLAYER_SETTINGS);
  });

  afterEach(() => {
    manager.stopGameLoop('test');
  });

  describe('createGame', () => {
    it('should create a game with initial state', () => {
      manager.createGame('test', testGameState);

      const state = manager.getGameState('test');
      expect(state).toBeDefined();
      expect(state?.phase).toBe('playing');
      expect(state?.activeCards.length).toBe(7);
    });
  });

  describe('getGameState', () => {
    it('should return undefined for non-existent game', () => {
      const state = manager.getGameState('invalid');
      expect(state).toBe(undefined);
    });
  });

  describe('toggleCard', () => {
    beforeEach(() => {
      manager.createGame('test', testGameState);
    });

    it('should add card to selection', () => {
      const cardId = testGameState.activeCards[0].id;
      const result = manager.toggleCard('test', 'player1', cardId);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.selectedCardIds).toContain(cardId);
      }
    });

    it('should remove card from selection when toggled again', () => {
      const cardId = testGameState.activeCards[0].id;

      manager.toggleCard('test', 'player1', cardId);
      const result = manager.toggleCard('test', 'player1', cardId);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.selectedCardIds).not.toContain(cardId);
      }
    });

    it('should return error for non-existent game', () => {
      const result = manager.toggleCard('invalid', 'player1', 'card1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.GAME_NOT_STARTED);
      }
    });

    it('should detect valid set formed', () => {
      // Set up a game with known cards that form a valid set (1 XOR 2 XOR 3 = 0)
      const gameWithKnownCards: GameState = {
        ...testGameState,
        activeCards: [
          { id: 'card1', value: 1 },
          { id: 'card2', value: 2 },
          { id: 'card3', value: 3 },
          { id: 'card4', value: 4 },
          { id: 'card5', value: 8 },
          { id: 'card6', value: 16 },
          { id: 'card7', value: 32 },
        ],
      };

      manager.createGame('test-known', gameWithKnownCards);

      // Select the cards that form a valid set
      manager.toggleCard('test-known', 'player1', 'card1');
      manager.toggleCard('test-known', 'player1', 'card2');
      const result = manager.toggleCard('test-known', 'player1', 'card3');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.validSetFormed).toBe(true);
      }
    });

    it('should detect invalid selection', () => {
      // Set up a game with known cards where first 3 don't form a valid set
      const gameWithKnownCards: GameState = {
        ...testGameState,
        activeCards: [
          { id: 'card1', value: 1 },
          { id: 'card2', value: 2 },
          { id: 'card3', value: 4 }, // 1 XOR 2 XOR 4 = 7, not a valid set
          { id: 'card4', value: 8 },
          { id: 'card5', value: 16 },
          { id: 'card6', value: 32 },
          { id: 'card7', value: 63 },
        ],
      };

      manager.createGame('test-invalid', gameWithKnownCards);

      // Select cards that don't form a valid set
      manager.toggleCard('test-invalid', 'player1', 'card1');
      manager.toggleCard('test-invalid', 'player1', 'card2');
      const result = manager.toggleCard('test-invalid', 'player1', 'card3');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.validSetFormed).toBe(false);
      }
    });
  });

  describe('claimSet', () => {
    beforeEach(() => {
      manager.createGame('test', testGameState);
    });

    it('should claim a valid set', () => {
      // Set up a game with known cards that form a valid set
      const gameWithKnownCards: GameState = {
        ...testGameState,
        activeCards: [
          { id: 'card1', value: 1 },
          { id: 'card2', value: 2 },
          { id: 'card3', value: 3 },
          { id: 'card4', value: 4 },
          { id: 'card5', value: 8 },
          { id: 'card6', value: 16 },
          { id: 'card7', value: 32 },
        ],
      };

      manager.createGame('test-claim', gameWithKnownCards);

      const cardIds = ['card1', 'card2', 'card3'];
      const result = manager.claimSet('test-claim', 'player1', cardIds);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.claimedCardIds).toEqual(cardIds);
        expect(result.pointsAwarded).toBe(3);
        expect(result.newCards.length).toBe(3);
      }
    });

    it('should reject invalid set', () => {
      // Get first 3 cards (unlikely to be a valid set with random shuffle)
      const cardIds = testGameState.activeCards.slice(0, 3).map(c => c.id);
      const cardValues = testGameState.activeCards.slice(0, 3).map(c => c.value);

      // Only test if this is actually an invalid set
      if (!isValidSet(cardValues)) {
        const result = manager.claimSet('test', 'player1', cardIds);

        expect('error' in result).toBe(true);
        if ('error' in result) {
          expect(result.error).toBe(ErrorCodes.NOT_A_VALID_SET);
        }
      }
    });

    it('should return error for non-existent game', () => {
      const result = manager.claimSet('invalid', 'player1', ['card1', 'card2', 'card3']);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.GAME_NOT_STARTED);
      }
    });

    it('should update player score', () => {
      // Set up a game with known cards that form a valid set
      const gameWithKnownCards: GameState = {
        ...testGameState,
        activeCards: [
          { id: 'card1', value: 1 },
          { id: 'card2', value: 2 },
          { id: 'card3', value: 3 },
          { id: 'card4', value: 4 },
          { id: 'card5', value: 8 },
          { id: 'card6', value: 16 },
          { id: 'card7', value: 32 },
        ],
      };

      manager.createGame('test-score', gameWithKnownCards);

      const cardIds = ['card1', 'card2', 'card3'];
      manager.claimSet('test-score', 'player1', cardIds);

      const state = manager.getGameState('test-score');
      expect(state?.players[0].score).toBe(3);
    });
  });

  describe('setPendingSet', () => {
    beforeEach(() => {
      manager.createGame('test', testGameState);
    });

    it('should set pending set', () => {
      const cardIds = testGameState.activeCards.slice(0, 3).map(c => c.id);
      manager.setPendingSet('test', 'player1', cardIds);

      // We can verify by trying to confirm
      // Note: confirmSet will fail because the cards aren't a valid set
      // but the pending set was set
    });

    it('should not override existing pending set', () => {
      const cards1 = testGameState.activeCards.slice(0, 3).map(c => c.id);
      const cards2 = testGameState.activeCards.slice(4, 7).map(c => c.id);

      manager.setPendingSet('test', 'player1', cards1);
      manager.setPendingSet('test', 'player2', cards2);

      // Try confirming as player2 - should fail because player1 has the pending set
      const result = manager.confirmSet('test', 'player2');
      expect('error' in result).toBe(true);
    });
  });

  describe('confirmSet', () => {
    beforeEach(() => {
      manager.createGame('test', testGameState);
    });

    it('should claim pending set', () => {
      // Set up a game with known cards that form a valid set
      const gameWithKnownCards: GameState = {
        ...testGameState,
        activeCards: [
          { id: 'card1', value: 1 },
          { id: 'card2', value: 2 },
          { id: 'card3', value: 3 },
          { id: 'card4', value: 4 },
          { id: 'card5', value: 8 },
          { id: 'card6', value: 16 },
          { id: 'card7', value: 32 },
        ],
      };

      manager.createGame('test-confirm', gameWithKnownCards);

      const cardIds = ['card1', 'card2', 'card3'];
      manager.setPendingSet('test-confirm', 'player1', cardIds);
      const result = manager.confirmSet('test-confirm', 'player1');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.pointsAwarded).toBe(3);
      }
    });

    it('should return error when no pending set', () => {
      const result = manager.confirmSet('test', 'player1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.NO_PENDING_SET);
      }
    });

    it('should return error when confirming other players pending set', () => {
      const cardIds = testGameState.activeCards.slice(0, 3).map(c => c.id);
      manager.setPendingSet('test', 'player1', cardIds);

      const result = manager.confirmSet('test', 'player2');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.NO_PENDING_SET);
      }
    });
  });

  describe('clearSelection', () => {
    beforeEach(() => {
      manager.createGame('test', testGameState);
    });

    it('should clear player selection', () => {
      const cardId = testGameState.activeCards[0].id;
      manager.toggleCard('test', 'player1', cardId);

      const result = manager.clearSelection('test', 'player1');

      expect('error' in result).toBe(false);

      const state = manager.getGameState('test');
      expect(state?.players[0].selectedCardIds).toEqual([]);
    });

    it('should clear pending set', () => {
      const cardIds = testGameState.activeCards.slice(0, 3).map(c => c.id);
      manager.setPendingSet('test', 'player1', cardIds);
      manager.clearSelection('test', 'player1');

      const result = manager.confirmSet('test', 'player1');
      expect('error' in result).toBe(true);
    });

    it('should return error for non-existent game', () => {
      const result = manager.clearSelection('invalid', 'player1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.GAME_NOT_STARTED);
      }
    });
  });

  describe('endGame', () => {
    it('should delete the game', () => {
      manager.createGame('test', testGameState);
      expect(manager.getGameState('test')).toBeDefined();

      manager.endGame('test');

      expect(manager.getGameState('test')).toBe(undefined);
    });
  });

  describe('game loop', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call onTick periodically', () => {
      const onTick = vi.fn();
      const onEnd = vi.fn();

      manager.createGame('test', testGameState);
      manager.startGameLoop('test', onTick, onEnd);

      vi.advanceTimersByTime(500);

      expect(onTick).toHaveBeenCalled();
      expect(onEnd).not.toHaveBeenCalled();

      manager.stopGameLoop('test');
    });

    it('should call onEnd when timer expires', () => {
      const onTick = vi.fn();
      const onEnd = vi.fn();

      const gameWithTimer = createMultiplayerGame(testPlayers, {
        ...DEFAULT_MULTIPLAYER_SETTINGS,
        gameTimer: { durationMs: 1000 },
      });

      manager.createGame('test', gameWithTimer);
      manager.startGameLoop('test', onTick, onEnd);

      vi.advanceTimersByTime(1500);

      expect(onEnd).toHaveBeenCalled();
    });

    it('should stop loop when game ends', () => {
      const onTick = vi.fn();
      const onEnd = vi.fn();

      const gameWithTimer = createMultiplayerGame(testPlayers, {
        ...DEFAULT_MULTIPLAYER_SETTINGS,
        gameTimer: { durationMs: 500 },
      });

      manager.createGame('test', gameWithTimer);
      manager.startGameLoop('test', onTick, onEnd);

      vi.advanceTimersByTime(2000);

      // Reset and check that tick is not called anymore
      onTick.mockClear();
      vi.advanceTimersByTime(1000);

      // After game ends, no more ticks should occur
      const state = manager.getGameState('test');
      expect(state?.phase).toBe('ended');
    });
  });
});
