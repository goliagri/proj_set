/**
 * Tests for Game State Management
 *
 * Tests game initialization, player actions, and game flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSinglePlayerGame,
  createMultiplayerGame,
  toggleCardSelection,
  getSelectedCardValues,
  isPlayerSelectionValid,
  claimSet,
  clearSelection,
  checkGameEnd,
  endGame,
  updateTimers,
  getWinners,
  getPlayer,
} from './state';
import { isValidSet } from './validation';
import { ACTIVE_CARD_COUNT } from '../types/card';
import {
  Player,
  GameState,
  DEFAULT_SINGLE_PLAYER_SETTINGS,
  DEFAULT_MULTIPLAYER_SETTINGS,
} from '../types/game';

describe('createSinglePlayerGame', () => {
  it('should create a game in playing phase', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    expect(game.phase).toBe('playing');
  });

  it('should deal 7 active cards', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    expect(game.activeCards.length).toBe(ACTIVE_CARD_COUNT);
    expect(game.activeCards.length).toBe(7);
  });

  it('should create a deck with remaining cards', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    expect(game.deck.length).toBe(63 - 7); // 56 remaining
  });

  it('should create one player with correct properties', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    expect(game.players.length).toBe(1);
    expect(game.players[0].id).toBe('player1');
    expect(game.players[0].name).toBe('TestPlayer');
    expect(game.players[0].score).toBe(0);
    expect(game.players[0].claimedCards).toEqual([]);
    expect(game.players[0].selectedCardIds).toEqual([]);
  });

  it('should use default settings when not provided', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    expect(game.settings).toEqual(DEFAULT_SINGLE_PLAYER_SETTINGS);
  });

  it('should use custom settings when provided', () => {
    const customSettings = {
      ...DEFAULT_SINGLE_PLAYER_SETTINGS,
      colorsEnabled: false,
      binaryMode: true,
    };
    const game = createSinglePlayerGame('player1', 'TestPlayer', customSettings);
    expect(game.settings.colorsEnabled).toBe(false);
    expect(game.settings.binaryMode).toBe(true);
  });

  it('should set timers from settings', () => {
    const settings = {
      ...DEFAULT_SINGLE_PLAYER_SETTINGS,
      turnTimer: { durationMs: 30000 },
      gameTimer: { durationMs: 300000 },
    };
    const game = createSinglePlayerGame('player1', 'TestPlayer', settings);
    expect(game.turnTimeRemainingMs).toBe(30000);
    expect(game.gameTimeRemainingMs).toBe(300000);
  });

  it('should have null timers when disabled', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    expect(game.turnTimeRemainingMs).toBe(null);
    expect(game.gameTimeRemainingMs).toBe(null);
  });

  it('should set startedAt timestamp', () => {
    const before = Date.now();
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    const after = Date.now();
    expect(game.startedAt).toBeGreaterThanOrEqual(before);
    expect(game.startedAt).toBeLessThanOrEqual(after);
  });
});

describe('createMultiplayerGame', () => {
  const createTestPlayers = (): Player[] => [
    {
      id: 'p1',
      name: 'Player1',
      playerNumber: 1,
      color: '#FF0000',
      claimedCards: [],
      selectedCardIds: [],
      score: 0,
      isConnected: true,
      isReady: true,
    },
    {
      id: 'p2',
      name: 'Player2',
      playerNumber: 2,
      color: '#00FF00',
      claimedCards: [],
      selectedCardIds: [],
      score: 0,
      isConnected: true,
      isReady: true,
    },
  ];

  it('should create a game with all players', () => {
    const players = createTestPlayers();
    const game = createMultiplayerGame(players);
    expect(game.players.length).toBe(2);
  });

  it('should reset player game state', () => {
    const players = createTestPlayers();
    players[0].score = 10; // Dirty state
    players[0].claimedCards = [{ id: 'old', value: 1 }];

    const game = createMultiplayerGame(players);
    expect(game.players[0].score).toBe(0);
    expect(game.players[0].claimedCards).toEqual([]);
    expect(game.players[0].selectedCardIds).toEqual([]);
  });

  it('should preserve player identity', () => {
    const players = createTestPlayers();
    const game = createMultiplayerGame(players);
    expect(game.players[0].id).toBe('p1');
    expect(game.players[0].name).toBe('Player1');
    expect(game.players[0].color).toBe('#FF0000');
  });

  it('should reassign player numbers', () => {
    const players = createTestPlayers();
    const game = createMultiplayerGame(players);
    expect(game.players[0].playerNumber).toBe(1);
    expect(game.players[1].playerNumber).toBe(2);
  });
});

describe('toggleCardSelection', () => {
  let game: GameState;

  beforeEach(() => {
    game = createSinglePlayerGame('player1', 'TestPlayer');
  });

  it('should add a card to selection', () => {
    const cardId = game.activeCards[0].id;
    const newGame = toggleCardSelection(game, 'player1', cardId);
    expect(newGame.players[0].selectedCardIds).toContain(cardId);
  });

  it('should remove a card from selection when toggled again', () => {
    const cardId = game.activeCards[0].id;
    let newGame = toggleCardSelection(game, 'player1', cardId);
    expect(newGame.players[0].selectedCardIds).toContain(cardId);

    newGame = toggleCardSelection(newGame, 'player1', cardId);
    expect(newGame.players[0].selectedCardIds).not.toContain(cardId);
  });

  it('should return unchanged state for unknown player', () => {
    const cardId = game.activeCards[0].id;
    const newGame = toggleCardSelection(game, 'unknown', cardId);
    expect(newGame).toEqual(game);
  });

  it('should return unchanged state for card not on table', () => {
    const newGame = toggleCardSelection(game, 'player1', 'fake-card-id');
    expect(newGame).toEqual(game);
  });

  it('should allow selecting multiple cards', () => {
    const card1 = game.activeCards[0].id;
    const card2 = game.activeCards[1].id;
    const card3 = game.activeCards[2].id;

    let newGame = toggleCardSelection(game, 'player1', card1);
    newGame = toggleCardSelection(newGame, 'player1', card2);
    newGame = toggleCardSelection(newGame, 'player1', card3);

    expect(newGame.players[0].selectedCardIds).toContain(card1);
    expect(newGame.players[0].selectedCardIds).toContain(card2);
    expect(newGame.players[0].selectedCardIds).toContain(card3);
  });

  it('should not mutate original state', () => {
    const cardId = game.activeCards[0].id;
    const originalSelection = [...game.players[0].selectedCardIds];
    toggleCardSelection(game, 'player1', cardId);
    expect(game.players[0].selectedCardIds).toEqual(originalSelection);
  });
});

describe('getSelectedCardValues', () => {
  let game: GameState;

  beforeEach(() => {
    game = createSinglePlayerGame('player1', 'TestPlayer');
  });

  it('should return empty array for no selection', () => {
    const values = getSelectedCardValues(game, 'player1');
    expect(values).toEqual([]);
  });

  it('should return card values for selected cards', () => {
    const cardId = game.activeCards[0].id;
    const expectedValue = game.activeCards[0].value;

    const newGame = toggleCardSelection(game, 'player1', cardId);
    const values = getSelectedCardValues(newGame, 'player1');

    expect(values).toEqual([expectedValue]);
  });

  it('should return empty array for unknown player', () => {
    const values = getSelectedCardValues(game, 'unknown');
    expect(values).toEqual([]);
  });

  it('should return values in selection order', () => {
    const card1 = game.activeCards[0];
    const card2 = game.activeCards[1];

    let newGame = toggleCardSelection(game, 'player1', card1.id);
    newGame = toggleCardSelection(newGame, 'player1', card2.id);

    const values = getSelectedCardValues(newGame, 'player1');
    expect(values).toEqual([card1.value, card2.value]);
  });
});

describe('isPlayerSelectionValid', () => {
  it('should return false for fewer than 3 cards', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer');
    expect(isPlayerSelectionValid(game, 'player1')).toBe(false);

    game = toggleCardSelection(game, 'player1', game.activeCards[0].id);
    expect(isPlayerSelectionValid(game, 'player1')).toBe(false);

    game = toggleCardSelection(game, 'player1', game.activeCards[1].id);
    expect(isPlayerSelectionValid(game, 'player1')).toBe(false);
  });

  it('should return true for valid 3-card set', () => {
    // Create a game with known cards that form a valid set
    // 1 XOR 2 XOR 3 = 0, so cards with values 1, 2, 3 form a valid set
    let game = createSinglePlayerGame('player1', 'TestPlayer');

    // Replace activeCards with known values that include a valid set
    game = {
      ...game,
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

    // Select the cards that form a valid set (1, 2, 3)
    game = toggleCardSelection(game, 'player1', 'card1');
    game = toggleCardSelection(game, 'player1', 'card2');
    game = toggleCardSelection(game, 'player1', 'card3');

    expect(isPlayerSelectionValid(game, 'player1')).toBe(true);
  });

  it('should return false for invalid 3-card selection', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer');

    // Use cards that don't form a valid set (1 XOR 2 XOR 4 = 7, not 0)
    game = {
      ...game,
      activeCards: [
        { id: 'card1', value: 1 },
        { id: 'card2', value: 2 },
        { id: 'card3', value: 4 },
        { id: 'card4', value: 8 },
        { id: 'card5', value: 16 },
        { id: 'card6', value: 32 },
        { id: 'card7', value: 63 },
      ],
    };

    game = toggleCardSelection(game, 'player1', 'card1');
    game = toggleCardSelection(game, 'player1', 'card2');
    game = toggleCardSelection(game, 'player1', 'card3');

    expect(isPlayerSelectionValid(game, 'player1')).toBe(false);
  });
});

describe('claimSet', () => {
  it('should not claim for invalid player', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    const cardIds = game.activeCards.slice(0, 3).map(c => c.id);
    const { state, pointsAwarded } = claimSet(game, 'unknown', cardIds);
    expect(state).toEqual(game);
    expect(pointsAwarded).toBe(0);
  });

  it('should not claim cards not on table', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    const { state, pointsAwarded } = claimSet(game, 'player1', ['fake1', 'fake2', 'fake3']);
    expect(state).toEqual(game);
    expect(pointsAwarded).toBe(0);
  });

  it('should claim a valid set and award points', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer');

    // Set up known cards with a valid set (1 XOR 2 XOR 3 = 0)
    game = {
      ...game,
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

    const cardIds = ['card1', 'card2', 'card3'];
    const { state: newGame, pointsAwarded } = claimSet(game, 'player1', cardIds);

    // Should award points (default is 'cards' mode = 3 points)
    expect(pointsAwarded).toBe(3);
    expect(newGame.players[0].score).toBe(3);

    // Cards should be in claimed pile
    expect(newGame.players[0].claimedCards.length).toBe(3);

    // Active cards should be replenished
    expect(newGame.activeCards.length).toBe(7);

    // Claimed cards should not be on table
    for (const cardId of cardIds) {
      expect(newGame.activeCards.map(c => c.id)).not.toContain(cardId);
    }
  });

  it('should clear player selection after claiming', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer');

    // Set up known cards with a valid set (1 XOR 2 XOR 3 = 0)
    game = {
      ...game,
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

    // Select the cards first
    game = toggleCardSelection(game, 'player1', 'card1');
    game = toggleCardSelection(game, 'player1', 'card2');
    game = toggleCardSelection(game, 'player1', 'card3');

    const cardIds = ['card1', 'card2', 'card3'];
    const { state: newGame } = claimSet(game, 'player1', cardIds);

    expect(newGame.players[0].selectedCardIds).toEqual([]);
  });

  it('should clear other players selections of claimed cards', () => {
    const players: Player[] = [
      {
        id: 'p1', name: 'P1', playerNumber: 1, color: '#F00',
        claimedCards: [], selectedCardIds: [], score: 0,
        isConnected: true, isReady: true,
      },
      {
        id: 'p2', name: 'P2', playerNumber: 2, color: '#0F0',
        claimedCards: [], selectedCardIds: [], score: 0,
        isConnected: true, isReady: true,
      },
    ];

    let game = createMultiplayerGame(players);

    // Set up known cards with a valid set (1 XOR 2 XOR 3 = 0)
    game = {
      ...game,
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

    // P2 selects one of the cards that P1 will claim
    game = toggleCardSelection(game, 'p2', 'card1');
    expect(game.players[1].selectedCardIds).toContain('card1');

    // P1 claims the set
    const cardIds = ['card1', 'card2', 'card3'];
    const { state: newGame } = claimSet(game, 'p1', cardIds);

    // P2's selection should be cleared for that card
    expect(newGame.players[1].selectedCardIds).not.toContain('card1');
  });

  it('should reset turn timer after claiming', () => {
    const settings = {
      ...DEFAULT_SINGLE_PLAYER_SETTINGS,
      turnTimer: { durationMs: 30000 },
    };
    let game = createSinglePlayerGame('player1', 'TestPlayer', settings);

    // Set up known cards with a valid set (1 XOR 2 XOR 3 = 0)
    game = {
      ...game,
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

    // Simulate time passing
    game = updateTimers(game, 10000);
    expect(game.turnTimeRemainingMs).toBe(20000);

    const cardIds = ['card1', 'card2', 'card3'];
    const { state: newGame } = claimSet(game, 'player1', cardIds);

    // Turn timer should be reset
    expect(newGame.turnTimeRemainingMs).toBe(30000);
  });

  it('should use sets scoring mode when configured', () => {
    const players: Player[] = [
      {
        id: 'p1', name: 'P1', playerNumber: 1, color: '#F00',
        claimedCards: [], selectedCardIds: [], score: 0,
        isConnected: true, isReady: true,
      },
    ];

    const settings = {
      ...DEFAULT_MULTIPLAYER_SETTINGS,
      scoringMode: 'sets' as const,
    };

    let game = createMultiplayerGame(players, settings);

    // Set up known cards with a valid set (1 XOR 2 XOR 3 = 0)
    game = {
      ...game,
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

    const cardIds = ['card1', 'card2', 'card3'];
    const { state: newGame, pointsAwarded } = claimSet(game, 'p1', cardIds);

    // Should award 1 point for the set
    expect(pointsAwarded).toBe(1);
    expect(newGame.players[0].score).toBe(1);
  });
});

describe('clearSelection', () => {
  it('should clear a players selection', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer');
    game = toggleCardSelection(game, 'player1', game.activeCards[0].id);
    game = toggleCardSelection(game, 'player1', game.activeCards[1].id);

    expect(game.players[0].selectedCardIds.length).toBe(2);

    game = clearSelection(game, 'player1');
    expect(game.players[0].selectedCardIds).toEqual([]);
  });

  it('should return unchanged state for unknown player', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    const newGame = clearSelection(game, 'unknown');
    expect(newGame).toEqual(game);
  });
});

describe('checkGameEnd', () => {
  it('should return null when game should continue', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    expect(checkGameEnd(game)).toBe(null);
  });

  it('should return timer_expired when game timer reaches 0', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer', {
      ...DEFAULT_SINGLE_PLAYER_SETTINGS,
      gameTimer: { durationMs: 1000 },
    });

    game = updateTimers(game, 1000);
    expect(game.gameTimeRemainingMs).toBe(0);
    expect(checkGameEnd(game)).toBe('timer_expired');
  });

  it('should return timer_expired when turn timer reaches 0', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer', {
      ...DEFAULT_SINGLE_PLAYER_SETTINGS,
      turnTimer: { durationMs: 1000 },
    });

    game = updateTimers(game, 1000);
    expect(game.turnTimeRemainingMs).toBe(0);
    expect(checkGameEnd(game)).toBe('timer_expired');
  });

  it('should return deck_empty when no cards left and no valid sets', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer');

    // Manually deplete deck
    game = { ...game, deck: [] };

    // Set active cards to values that don't form a valid set
    game = {
      ...game,
      activeCards: [
        { id: 'a', value: 1 },
        { id: 'b', value: 4 },
        { id: 'c', value: 16 },
      ],
    };

    expect(checkGameEnd(game)).toBe('deck_empty');
  });

  it('should return null when deck empty but valid set exists', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer');

    // Manually deplete deck
    game = { ...game, deck: [] };

    // Set active cards that form a valid set
    game = {
      ...game,
      activeCards: [
        { id: 'a', value: 1 },
        { id: 'b', value: 2 },
        { id: 'c', value: 3 }, // 1^2^3 = 0
      ],
    };

    expect(checkGameEnd(game)).toBe(null);
  });

  it('should not end game in infinite deck mode', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer', {
      ...DEFAULT_SINGLE_PLAYER_SETTINGS,
      infiniteDeck: true,
    });

    game = { ...game, deck: [] };
    game = {
      ...game,
      activeCards: [
        { id: 'a', value: 1 },
        { id: 'b', value: 4 },
        { id: 'c', value: 16 },
      ],
    };

    expect(checkGameEnd(game)).toBe(null);
  });
});

describe('endGame', () => {
  it('should set phase to ended', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    const endedGame = endGame(game, 'deck_empty');
    expect(endedGame.phase).toBe('ended');
  });

  it('should set end reason', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');

    expect(endGame(game, 'deck_empty').endReason).toBe('deck_empty');
    expect(endGame(game, 'timer_expired').endReason).toBe('timer_expired');
    expect(endGame(game, 'player_quit').endReason).toBe('player_quit');
  });
});

describe('updateTimers', () => {
  it('should decrease turn timer', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer', {
      ...DEFAULT_SINGLE_PLAYER_SETTINGS,
      turnTimer: { durationMs: 30000 },
    });

    game = updateTimers(game, 5000);
    expect(game.turnTimeRemainingMs).toBe(25000);
  });

  it('should decrease game timer', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer', {
      ...DEFAULT_SINGLE_PLAYER_SETTINGS,
      gameTimer: { durationMs: 300000 },
    });

    game = updateTimers(game, 10000);
    expect(game.gameTimeRemainingMs).toBe(290000);
  });

  it('should not go below 0', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer', {
      ...DEFAULT_SINGLE_PLAYER_SETTINGS,
      turnTimer: { durationMs: 1000 },
    });

    game = updateTimers(game, 5000);
    expect(game.turnTimeRemainingMs).toBe(0);
  });

  it('should not affect null timers', () => {
    let game = createSinglePlayerGame('player1', 'TestPlayer');
    game = updateTimers(game, 5000);
    expect(game.turnTimeRemainingMs).toBe(null);
    expect(game.gameTimeRemainingMs).toBe(null);
  });
});

describe('getWinners', () => {
  it('should return empty array if game not ended', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    expect(getWinners(game)).toEqual([]);
  });

  it('should return the player with highest score', () => {
    const players: Player[] = [
      {
        id: 'p1', name: 'P1', playerNumber: 1, color: '#F00',
        claimedCards: [], selectedCardIds: [], score: 10,
        isConnected: true, isReady: true,
      },
      {
        id: 'p2', name: 'P2', playerNumber: 2, color: '#0F0',
        claimedCards: [], selectedCardIds: [], score: 5,
        isConnected: true, isReady: true,
      },
    ];

    let game = createMultiplayerGame(players);
    // Manually set scores and end game
    game = {
      ...game,
      players: players,
      phase: 'ended',
      endReason: 'deck_empty',
    };

    const winners = getWinners(game);
    expect(winners.length).toBe(1);
    expect(winners[0].id).toBe('p1');
  });

  it('should return multiple players in case of tie', () => {
    const players: Player[] = [
      {
        id: 'p1', name: 'P1', playerNumber: 1, color: '#F00',
        claimedCards: [], selectedCardIds: [], score: 10,
        isConnected: true, isReady: true,
      },
      {
        id: 'p2', name: 'P2', playerNumber: 2, color: '#0F0',
        claimedCards: [], selectedCardIds: [], score: 10,
        isConnected: true, isReady: true,
      },
    ];

    let game = createMultiplayerGame(players);
    game = {
      ...game,
      players: players,
      phase: 'ended',
      endReason: 'deck_empty',
    };

    const winners = getWinners(game);
    expect(winners.length).toBe(2);
  });
});

describe('getPlayer', () => {
  it('should return the player by id', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    const player = getPlayer(game, 'player1');
    expect(player).not.toBe(undefined);
    expect(player?.name).toBe('TestPlayer');
  });

  it('should return undefined for unknown player', () => {
    const game = createSinglePlayerGame('player1', 'TestPlayer');
    const player = getPlayer(game, 'unknown');
    expect(player).toBe(undefined);
  });
});

describe('infinite deck mode', () => {
  it('should return cards to deck after claiming', () => {
    const settings = {
      ...DEFAULT_SINGLE_PLAYER_SETTINGS,
      infiniteDeck: true,
    };
    let game = createSinglePlayerGame('player1', 'TestPlayer', settings);
    const initialDeckSize = game.deck.length;

    // Set up known cards with a valid set (1 XOR 2 XOR 3 = 0)
    game = {
      ...game,
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

    const cardIds = ['card1', 'card2', 'card3'];
    const { state: newGame } = claimSet(game, 'player1', cardIds);

    // Deck should have same size (3 removed for deal, 3 returned)
    // So deck goes: initial - 3 + 3 = initial
    expect(newGame.deck.length).toBe(initialDeckSize);
  });
});
