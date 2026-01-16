/**
 * Single Player Game Page
 *
 * The main game screen for single-player mode.
 * Manages local game state and handles all game logic client-side.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_SINGLE_PLAYER_SETTINGS, SinglePlayerSettings, isValidSet, CardDisplayMode } from '@projective-set/shared';
import { GameProvider, useGame } from '@/contexts/GameContext';
import { GameBoard } from '@/components/game/GameBoard';
import { GameTimer } from '@/components/game/GameTimer';
import { DiscardPile } from '@/components/game/DiscardPile';

/**
 * Inner component that uses game context.
 */
function SinglePlayerGameInner() {
  const navigate = useNavigate();
  const { state, startSinglePlayer, endGameAction, toggleCard, isSelectionValid, claimSetAction, updateTimers } = useGame();

  // Initialize game on mount
  useEffect(() => {
    const settingsJson = sessionStorage.getItem('singlePlayerSettings');
    const settings: SinglePlayerSettings = settingsJson
      ? JSON.parse(settingsJson)
      : DEFAULT_SINGLE_PLAYER_SETTINGS;

    // TODO: Get player name from user input or storage
    startSinglePlayer('Player', settings);
  }, [startSinglePlayer]);

  // Timer update loop
  useEffect(() => {
    if (!state || state.phase !== 'playing') return;
    if (state.turnTimeRemainingMs === null && state.gameTimeRemainingMs === null) return;

    const interval = setInterval(() => {
      const newTurnTime = state.turnTimeRemainingMs !== null
        ? Math.max(0, state.turnTimeRemainingMs - 100)
        : null;
      const newGameTime = state.gameTimeRemainingMs !== null
        ? Math.max(0, state.gameTimeRemainingMs - 100)
        : null;

      updateTimers(newTurnTime, newGameTime);

      // Check if time ran out
      if ((newTurnTime !== null && newTurnTime <= 0) || (newGameTime !== null && newGameTime <= 0)) {
        endGameAction('timer_expired');
      }
    }, 100);

    return () => clearInterval(interval);
  }, [state?.phase, state?.turnTimeRemainingMs, state?.gameTimeRemainingMs, updateTimers, endGameAction]);

  // Navigate to game over when game ends
  useEffect(() => {
    if (state?.phase === 'ended') {
      sessionStorage.setItem('gameResult', JSON.stringify(state));
      navigate('/gameover');
    }
  }, [state?.phase, navigate]);

  if (!state) {
    return <div className="page">Loading...</div>;
  }

  const player = state.players[0];

  // Handle card click - toggle selection
  const handleCardClick = (cardId: string) => {
    const currentSelection = player.selectedCardIds;
    const isAlreadySelected = currentSelection.includes(cardId);

    // Compute what the new selection will be after toggle
    const newSelection = isAlreadySelected
      ? currentSelection.filter(id => id !== cardId)
      : [...currentSelection, cardId];

    // Get the card values for the new selection
    const newSelectionValues = newSelection
      .map(id => state.activeCards.find(c => c.id === id)?.value)
      .filter((v): v is number => v !== undefined);

    // Check if the new selection forms a valid set
    const willBeValid = isValidSet(newSelectionValues);

    if (willBeValid && state.settings.setFoundBehavior === 'immediate') {
      // In immediate mode, toggle then immediately claim
      toggleCard(player.id, cardId);
      claimSetAction(player.id, newSelection);
    } else {
      // Just toggle the selection
      toggleCard(player.id, cardId);
    }
  };

  // Handle set confirmation (for 'click' mode)
  const handleConfirmSet = () => {
    if (isSelectionValid(player.id)) {
      claimSetAction(player.id, player.selectedCardIds);
    }
  };

  // Determine display mode based on settings
  const displayMode = state.settings.binaryMode
    ? 'binary'
    : state.settings.colorsEnabled
    ? 'standard'
    : 'colorless';

  return (
    <div className="page single-player-game">
      <div className="game-header">
        <button
          className="btn btn-secondary"
          onClick={() => {
            endGameAction('player_quit');
            navigate('/');
          }}
        >
          Back to Menu
        </button>

        {(state.turnTimeRemainingMs !== null || state.gameTimeRemainingMs !== null) && (
          <GameTimer
            turnTimeMs={state.turnTimeRemainingMs}
            gameTimeMs={state.gameTimeRemainingMs}
          />
        )}
      </div>

      <div className="game-layout">
        <DiscardPile
          claimedCards={player.claimedCards}
          displayMode={displayMode}
        />

        <GameBoard
          activeCards={state.activeCards}
          players={state.players}
          currentPlayerId={player.id}
          settings={state.settings}
          deckCount={state.deck.length}
          onCardClick={handleCardClick}
          onConfirmSet={handleConfirmSet}
        />
      </div>
    </div>
  );
}

/**
 * Wrapper that provides game context.
 */
export function SinglePlayerGame() {
  return (
    <GameProvider>
      <SinglePlayerGameInner />
    </GameProvider>
  );
}
