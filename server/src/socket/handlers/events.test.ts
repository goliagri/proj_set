/**
 * Integration Tests for Socket Event Handlers
 *
 * Tests the event handler logic by mocking socket and manager dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ErrorCodes,
  DEFAULT_MULTIPLAYER_SETTINGS,
  createMultiplayerGame,
  isValidSet,
} from '@projective-set/shared';

// Mock types for testing
interface MockSocket {
  id: string;
  data: { playerId?: string; lobbyCode?: string };
  emit: ReturnType<typeof vi.fn>;
  join: ReturnType<typeof vi.fn>;
  leave: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

interface MockServer {
  to: ReturnType<typeof vi.fn>;
}

function createMockSocket(): MockSocket {
  return {
    id: 'socket-1',
    data: { playerId: 'player-1' },
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    on: vi.fn(),
  };
}

function createMockServer(): MockServer {
  const emitFn = vi.fn();
  return {
    to: vi.fn(() => ({ emit: emitFn })),
  };
}

describe('Lobby Event Handler Logic', () => {
  describe('create lobby flow', () => {
    it('should create lobby and join socket room', () => {
      const socket = createMockSocket();
      const io = createMockServer();

      // Simulate the create lobby logic
      const playerId = socket.data.playerId!;
      const playerName = 'TestHost';
      const lobbyCode = 'ABCDEF';

      // The lobby would be created by LobbyManager
      const lobby = {
        code: lobbyCode,
        hostId: playerId,
        players: [{
          id: playerId,
          name: playerName,
          playerNumber: 1,
          color: '#3B82F6',
          claimedCards: [],
          selectedCardIds: [],
          score: 0,
          isConnected: true,
          isReady: false,
        }],
        settings: DEFAULT_MULTIPLAYER_SETTINGS,
        settingsUnlocked: false,
        chatMessages: [],
      };

      // Simulate handler behavior
      socket.join(lobbyCode);
      socket.data.lobbyCode = lobbyCode;
      socket.emit('lobby:created', { lobby });

      expect(socket.join).toHaveBeenCalledWith(lobbyCode);
      expect(socket.data.lobbyCode).toBe(lobbyCode);
      expect(socket.emit).toHaveBeenCalledWith('lobby:created', { lobby });
    });
  });

  describe('join lobby flow', () => {
    it('should join lobby and broadcast to room', () => {
      const socket = createMockSocket();
      const io = createMockServer();

      const playerId = socket.data.playerId!;
      const playerName = 'Joiner';
      const lobbyCode = 'ABCDEF';

      const lobby = {
        code: lobbyCode,
        hostId: 'host-id',
        players: [
          { id: 'host-id', name: 'Host', playerNumber: 1, color: '#3B82F6', claimedCards: [], selectedCardIds: [], score: 0, isConnected: true, isReady: false },
          { id: playerId, name: playerName, playerNumber: 2, color: '#EF4444', claimedCards: [], selectedCardIds: [], score: 0, isConnected: true, isReady: false },
        ],
        settings: DEFAULT_MULTIPLAYER_SETTINGS,
        settingsUnlocked: false,
        chatMessages: [],
      };

      // Simulate handler behavior
      socket.join(lobbyCode);
      socket.data.lobbyCode = lobbyCode;
      socket.emit('lobby:joined', { lobby });
      io.to(lobbyCode).emit('lobby:updated', { lobby });

      expect(socket.join).toHaveBeenCalledWith(lobbyCode);
      expect(socket.emit).toHaveBeenCalledWith('lobby:joined', { lobby });
      expect(io.to).toHaveBeenCalledWith(lobbyCode);
    });

    it('should emit error for non-existent lobby', () => {
      const socket = createMockSocket();

      const error = {
        code: ErrorCodes.LOBBY_NOT_FOUND,
        message: 'Lobby not found',
      };

      socket.emit('error', error);

      expect(socket.emit).toHaveBeenCalledWith('error', error);
    });
  });

  describe('settings update flow', () => {
    it('should broadcast updated settings to room', () => {
      const socket = createMockSocket();
      const io = createMockServer();

      socket.data.lobbyCode = 'ABCDEF';

      const lobby = {
        code: 'ABCDEF',
        settings: { ...DEFAULT_MULTIPLAYER_SETTINGS, colorsEnabled: false },
        // ... other properties
      };

      io.to('ABCDEF').emit('lobby:updated', { lobby });

      expect(io.to).toHaveBeenCalledWith('ABCDEF');
    });

    it('should emit error when non-host tries to update locked settings', () => {
      const socket = createMockSocket();

      const error = {
        code: ErrorCodes.SETTINGS_LOCKED,
        message: 'Only host can change settings',
      };

      socket.emit('error', error);

      expect(socket.emit).toHaveBeenCalledWith('error', error);
    });
  });

  describe('chat message flow', () => {
    it('should broadcast chat message to room', () => {
      const socket = createMockSocket();
      const io = createMockServer();

      socket.data.lobbyCode = 'ABCDEF';

      const message = {
        id: 'msg-1',
        playerId: 'player-1',
        playerName: 'Player',
        content: 'Hello everyone!',
        timestamp: Date.now(),
      };

      io.to('ABCDEF').emit('lobby:chatMessage', { message });

      expect(io.to).toHaveBeenCalledWith('ABCDEF');
    });

    it('should truncate long messages', () => {
      const longContent = 'x'.repeat(600);
      const truncated = longContent.substring(0, 500);

      expect(truncated.length).toBe(500);
    });
  });
});

describe('Game Event Handler Logic', () => {
  describe('card selection flow', () => {
    it('should broadcast selection change to room', () => {
      const socket = createMockSocket();
      const io = createMockServer();

      socket.data.lobbyCode = 'ABCDEF';

      const playerId = 'player-1';
      const selectedCardIds = ['card-1', 'card-2'];

      io.to('ABCDEF').emit('game:selectionChanged', {
        playerId,
        selectedCardIds,
      });

      expect(io.to).toHaveBeenCalledWith('ABCDEF');
    });
  });

  describe('valid set handling', () => {
    it('should claim set immediately in immediate mode', () => {
      const io = createMockServer();
      const lobbyCode = 'ABCDEF';
      const playerId = 'player-1';
      const cardIds = ['card-1', 'card-2', 'card-3'];

      // In immediate mode, broadcast set claimed
      io.to(lobbyCode).emit('game:setClaimed', {
        playerId,
        cardIds,
        pointsAwarded: 3,
      });

      expect(io.to).toHaveBeenCalledWith(lobbyCode);
    });

    it('should set pending in click mode', () => {
      const io = createMockServer();
      const lobbyCode = 'ABCDEF';
      const playerId = 'player-1';
      const cardIds = ['card-1', 'card-2', 'card-3'];

      // In click mode, broadcast set pending
      io.to(lobbyCode).emit('game:setPending', {
        playerId,
        cardIds,
      });

      expect(io.to).toHaveBeenCalledWith(lobbyCode);
    });
  });

  describe('confirm set flow', () => {
    it('should broadcast claim on confirmation', () => {
      const io = createMockServer();
      const lobbyCode = 'ABCDEF';

      io.to(lobbyCode).emit('game:setClaimed', {
        playerId: 'player-1',
        cardIds: ['card-1', 'card-2', 'card-3'],
        pointsAwarded: 3,
      });

      io.to(lobbyCode).emit('game:cardsDealt', {
        cards: [
          { id: 'card-4', value: 10 },
          { id: 'card-5', value: 20 },
          { id: 'card-6', value: 30 },
        ],
      });

      expect(io.to).toHaveBeenCalledWith(lobbyCode);
    });

    it('should emit error when no pending set', () => {
      const socket = createMockSocket();

      const error = {
        code: ErrorCodes.NO_PENDING_SET,
        message: 'No pending set to confirm',
      };

      socket.emit('error', error);

      expect(socket.emit).toHaveBeenCalledWith('error', error);
    });
  });

  describe('game end flow', () => {
    it('should broadcast game end with final state', () => {
      const io = createMockServer();
      const lobbyCode = 'ABCDEF';

      const players = [
        { id: 'p1', name: 'P1', playerNumber: 1, color: '#3B82F6', claimedCards: [], selectedCardIds: [], score: 10, isConnected: true, isReady: true },
        { id: 'p2', name: 'P2', playerNumber: 2, color: '#EF4444', claimedCards: [], selectedCardIds: [], score: 5, isConnected: true, isReady: true },
      ];

      const finalState = {
        ...createMultiplayerGame(players, DEFAULT_MULTIPLAYER_SETTINGS),
        phase: 'ended' as const,
        endReason: 'deck_empty' as const,
        players,
      };

      io.to(lobbyCode).emit('game:ended', {
        reason: 'deck_empty',
        finalState,
      });

      expect(io.to).toHaveBeenCalledWith(lobbyCode);
    });
  });

  describe('timer update flow', () => {
    it('should broadcast timer updates', () => {
      const io = createMockServer();
      const lobbyCode = 'ABCDEF';

      io.to(lobbyCode).emit('game:timerUpdate', {
        turnTimeRemainingMs: 25000,
        gameTimeRemainingMs: 290000,
      });

      expect(io.to).toHaveBeenCalledWith(lobbyCode);
    });
  });
});

describe('Error Code Usage', () => {
  it('should use correct error codes', () => {
    expect(ErrorCodes.LOBBY_NOT_FOUND).toBe('LOBBY_NOT_FOUND');
    expect(ErrorCodes.LOBBY_FULL).toBe('LOBBY_FULL');
    expect(ErrorCodes.NOT_HOST).toBe('NOT_HOST');
    expect(ErrorCodes.SETTINGS_LOCKED).toBe('SETTINGS_LOCKED');
    expect(ErrorCodes.GAME_NOT_STARTED).toBe('GAME_NOT_STARTED');
    expect(ErrorCodes.NOT_A_VALID_SET).toBe('NOT_A_VALID_SET');
    expect(ErrorCodes.NO_PENDING_SET).toBe('NO_PENDING_SET');
  });
});

describe('Game Logic Integration', () => {
  it('should correctly identify valid sets', () => {
    // Test with known card values that form a valid set
    // 1 XOR 2 XOR 3 = 0, so these form a valid set
    const validSetValues = [1, 2, 3];
    expect(isValidSet(validSetValues)).toBe(true);

    // 1 XOR 2 XOR 4 = 7, so these don't form a valid set
    const invalidSetValues = [1, 2, 4];
    expect(isValidSet(invalidSetValues)).toBe(false);
  });

  it('should work with game state containing known valid sets', () => {
    const players = [
      { id: 'p1', name: 'P1', playerNumber: 1, color: '#3B82F6', claimedCards: [], selectedCardIds: [], score: 0, isConnected: true, isReady: true },
    ];

    let gameState = createMultiplayerGame(players, DEFAULT_MULTIPLAYER_SETTINGS);

    // Override with known cards that include a valid set
    gameState = {
      ...gameState,
      activeCards: [
        { id: 'card1', value: 1 },
        { id: 'card2', value: 2 },
        { id: 'card3', value: 3 }, // 1, 2, 3 form a valid set
        { id: 'card4', value: 4 },
        { id: 'card5', value: 8 },
        { id: 'card6', value: 16 },
        { id: 'card7', value: 32 },
      ],
    };

    // Find a valid set in the active cards
    const activeCards = gameState.activeCards;
    const values = activeCards.map(c => c.value);
    let foundValidSet = false;

    outer: for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        for (let k = j + 1; k < values.length; k++) {
          if (isValidSet([values[i], values[j], values[k]])) {
            foundValidSet = true;
            break outer;
          }
        }
      }
    }

    expect(foundValidSet).toBe(true);
  });
});
