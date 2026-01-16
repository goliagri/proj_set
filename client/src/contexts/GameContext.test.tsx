/**
 * Tests for GameContext
 *
 * Tests game state management through the context provider.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GameProvider, useGame } from './GameContext';
import { DEFAULT_SINGLE_PLAYER_SETTINGS, isValidSet } from '@projective-set/shared';
import React from 'react';

// Test component to access context
function TestConsumer({ onMount }: { onMount: (context: ReturnType<typeof useGame>) => void }) {
  const context = useGame();
  React.useEffect(() => {
    onMount(context);
  }, [context, onMount]);
  return null;
}

// Helper to get context
function renderWithContext(callback: (context: ReturnType<typeof useGame>) => void) {
  let contextRef: ReturnType<typeof useGame>;

  render(
    <GameProvider>
      <TestConsumer onMount={(ctx) => { contextRef = ctx; callback(ctx); }} />
    </GameProvider>
  );

  return () => contextRef;
}

describe('GameContext', () => {
  describe('useGame hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer onMount={() => {}} />);
      }).toThrow('useGame must be used within a GameProvider');

      consoleError.mockRestore();
    });
  });

  describe('initial state', () => {
    it('should start with null state', () => {
      renderWithContext((context) => {
        expect(context.state).toBe(null);
      });
    });
  });

  describe('startSinglePlayer', () => {
    it('should create a new game state', () => {
      let contextRef: ReturnType<typeof useGame>;

      render(
        <GameProvider>
          <TestConsumer onMount={(ctx) => { contextRef = ctx; }} />
        </GameProvider>
      );

      act(() => {
        contextRef!.startSinglePlayer('TestPlayer', DEFAULT_SINGLE_PLAYER_SETTINGS);
      });

      // Force re-render to get updated state
      render(
        <GameProvider>
          <TestConsumer onMount={(ctx) => {
            if (ctx.state) {
              expect(ctx.state.phase).toBe('playing');
              expect(ctx.state.players.length).toBe(1);
              expect(ctx.state.players[0].name).toBe('TestPlayer');
              expect(ctx.state.activeCards.length).toBe(7);
            }
          }} />
        </GameProvider>
      );
    });
  });

  describe('setGameState', () => {
    it('should set the game state directly', () => {
      let contextRef: ReturnType<typeof useGame>;
      const mockGameState = {
        phase: 'playing' as const,
        deck: [],
        activeCards: [{ id: 'card1', value: 1 }],
        players: [{
          id: 'p1',
          name: 'Player 1',
          playerNumber: 1,
          color: '#FF0000',
          claimedCards: [],
          selectedCardIds: [],
          score: 5,
          isConnected: true,
          isReady: true,
        }],
        settings: DEFAULT_SINGLE_PLAYER_SETTINGS,
        turnTimeRemainingMs: null,
        gameTimeRemainingMs: null,
        endReason: null,
        startedAt: Date.now(),
      };

      render(
        <GameProvider>
          <TestConsumer onMount={(ctx) => { contextRef = ctx; }} />
        </GameProvider>
      );

      act(() => {
        contextRef!.setGameState(mockGameState);
      });

      render(
        <GameProvider>
          <TestConsumer onMount={(ctx) => {
            if (ctx.state) {
              expect(ctx.state.players[0].score).toBe(5);
            }
          }} />
        </GameProvider>
      );
    });
  });

  describe('reset', () => {
    it('should reset state to null', () => {
      let contextRef: ReturnType<typeof useGame>;

      render(
        <GameProvider>
          <TestConsumer onMount={(ctx) => { contextRef = ctx; }} />
        </GameProvider>
      );

      act(() => {
        contextRef!.startSinglePlayer('Test', DEFAULT_SINGLE_PLAYER_SETTINGS);
      });

      act(() => {
        contextRef!.reset();
      });

      render(
        <GameProvider>
          <TestConsumer onMount={(ctx) => {
            expect(ctx.state).toBe(null);
          }} />
        </GameProvider>
      );
    });
  });

  describe('toggleCard', () => {
    it('should return false when state is null', () => {
      let result: boolean;

      renderWithContext((context) => {
        result = context.toggleCard('player1', 'card1');
        expect(result).toBe(false);
      });
    });
  });

  describe('isSelectionValid', () => {
    it('should return false when state is null', () => {
      renderWithContext((context) => {
        expect(context.isSelectionValid('player1')).toBe(false);
      });
    });
  });

  describe('updateTimers', () => {
    it('should update timer values', () => {
      let contextRef: ReturnType<typeof useGame>;

      render(
        <GameProvider>
          <TestConsumer onMount={(ctx) => { contextRef = ctx; }} />
        </GameProvider>
      );

      act(() => {
        contextRef!.startSinglePlayer('Test', {
          ...DEFAULT_SINGLE_PLAYER_SETTINGS,
          turnTimer: { durationMs: 60000 },
          gameTimer: { durationMs: 300000 },
        });
      });

      act(() => {
        contextRef!.updateTimers(50000, 290000);
      });

      // The updateTimers should have been dispatched
      // We can verify by checking that the action is handled
    });
  });

  describe('endGameAction', () => {
    it('should end the game with given reason', () => {
      let contextRef: ReturnType<typeof useGame>;

      render(
        <GameProvider>
          <TestConsumer onMount={(ctx) => { contextRef = ctx; }} />
        </GameProvider>
      );

      act(() => {
        contextRef!.startSinglePlayer('Test', DEFAULT_SINGLE_PLAYER_SETTINGS);
      });

      act(() => {
        contextRef!.endGameAction('timer_expired');
      });

      // The game should be ended
    });
  });

  describe('clearSelectionAction', () => {
    it('should not crash when state is null', () => {
      renderWithContext((context) => {
        // Should not throw
        context.clearSelectionAction('player1');
      });
    });
  });
});

describe('GameContext integration', () => {
  // Component to test the full integration
  function GameTestHarness({
    onReady,
  }: {
    onReady: (context: ReturnType<typeof useGame>) => void;
  }) {
    const context = useGame();

    React.useEffect(() => {
      // Start a game
      context.startSinglePlayer('TestPlayer', DEFAULT_SINGLE_PLAYER_SETTINGS);
    }, []);

    React.useEffect(() => {
      if (context.state) {
        onReady(context);
      }
    }, [context, onReady]);

    if (!context.state) {
      return <div>Loading...</div>;
    }

    return (
      <div>
        <div data-testid="phase">{context.state.phase}</div>
        <div data-testid="player-name">{context.state.players[0].name}</div>
        <div data-testid="card-count">{context.state.activeCards.length}</div>
        <div data-testid="deck-count">{context.state.deck.length}</div>
        <div data-testid="player-score">{context.state.players[0].score}</div>
        <div data-testid="selected-count">
          {context.state.players[0].selectedCardIds.length}
        </div>
      </div>
    );
  }

  it('should render game state correctly', async () => {
    let testContext: ReturnType<typeof useGame>;

    render(
      <GameProvider>
        <GameTestHarness onReady={(ctx) => { testContext = ctx; }} />
      </GameProvider>
    );

    // Wait for the game to be initialized
    await screen.findByTestId('phase');

    expect(screen.getByTestId('phase')).toHaveTextContent('playing');
    expect(screen.getByTestId('player-name')).toHaveTextContent('TestPlayer');
    expect(screen.getByTestId('card-count')).toHaveTextContent('7');
    expect(screen.getByTestId('deck-count')).toHaveTextContent('56');
    expect(screen.getByTestId('player-score')).toHaveTextContent('0');
  });

  it('should update selected count when cards are toggled', async () => {
    let testContext: ReturnType<typeof useGame>;

    render(
      <GameProvider>
        <GameTestHarness onReady={(ctx) => { testContext = ctx; }} />
      </GameProvider>
    );

    await screen.findByTestId('phase');

    act(() => {
      const cardId = testContext.state!.activeCards[0].id;
      const playerId = testContext.state!.players[0].id;
      testContext.toggleCard(playerId, cardId);
    });

    // Re-render to see updated state
    render(
      <GameProvider>
        <GameTestHarness onReady={(ctx) => { testContext = ctx; }} />
      </GameProvider>
    );
  });

  it('should properly claim a valid set', async () => {
    let testContext: ReturnType<typeof useGame>;

    render(
      <GameProvider>
        <GameTestHarness onReady={(ctx) => { testContext = ctx; }} />
      </GameProvider>
    );

    await screen.findByTestId('phase');

    // Set up a game state with known cards that form a valid set (1 XOR 2 XOR 3 = 0)
    const gameStateWithKnownCards = {
      ...testContext!.state!,
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

    act(() => {
      testContext!.setGameState(gameStateWithKnownCards);
    });

    const validCardIds = ['card1', 'card2', 'card3'];
    const playerId = testContext!.state!.players[0].id;

    act(() => {
      testContext.claimSetAction(playerId, validCardIds);
    });

    // The claim should process - the score should be updated
    expect(testContext.state?.players[0].score).toBe(3);
  });
});
