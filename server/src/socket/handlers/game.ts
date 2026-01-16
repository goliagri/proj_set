/**
 * Game Event Handlers
 *
 * Handles all in-game socket events:
 * - Card selection and deselection
 * - Set confirmation (in click mode)
 * - Game state synchronization
 */

import { TypedServer, TypedSocket } from '../index';
import { getPlayerId } from './connection';
import { gameManager } from '../../managers/GameManager';
import { lobbyManager } from '../../managers/LobbyManager';
import { ErrorCodes, createMultiplayerGame } from '@projective-set/shared';

/**
 * Attach game event handlers to a socket.
 *
 * @param io - The Socket.IO server instance
 * @param socket - The socket to attach handlers to
 */
export function handleGameEvents(io: TypedServer, socket: TypedSocket): void {
  const playerId = getPlayerId(socket);
  if (!playerId) return;

  // =========================================================================
  // Toggle Card Selection
  // =========================================================================
  socket.on('game:toggleCard', ({ cardId }) => {
    const lobbyCode = socket.data.lobbyCode;
    if (!lobbyCode) return;

    const result = gameManager.toggleCard(lobbyCode, playerId, cardId);

    if ('error' in result) {
      socket.emit('error', {
        code: result.error,
        message: result.message,
      });
      return;
    }

    // Broadcast selection change to all players
    io.to(lobbyCode).emit('game:selectionChanged', {
      playerId,
      selectedCardIds: result.selectedCardIds,
    });

    // If the selection forms a valid set, handle accordingly
    if (result.validSetFormed) {
      handleValidSet(io, lobbyCode, playerId, result.selectedCardIds);
    }
  });

  // =========================================================================
  // Confirm Set (Click Mode)
  // =========================================================================
  socket.on('game:confirmSet', () => {
    const lobbyCode = socket.data.lobbyCode;
    if (!lobbyCode) return;

    const result = gameManager.confirmSet(lobbyCode, playerId);

    if ('error' in result) {
      socket.emit('error', {
        code: result.error,
        message: result.message,
      });
      return;
    }

    // Broadcast the set claim
    io.to(lobbyCode).emit('game:setClaimed', {
      playerId,
      cardIds: result.claimedCardIds,
      pointsAwarded: result.pointsAwarded,
    });

    // Send new cards dealt
    if (result.newCards.length > 0) {
      io.to(lobbyCode).emit('game:cardsDealt', {
        cards: result.newCards,
      });
    }

    // Check for game end
    if (result.gameEnded) {
      const finalState = gameManager.getGameState(lobbyCode);
      if (finalState) {
        io.to(lobbyCode).emit('game:ended', {
          reason: finalState.endReason || 'deck_empty',
          finalState,
        });
      }
    }
  });

  // =========================================================================
  // Clear Selection
  // =========================================================================
  socket.on('game:clearSelection', () => {
    const lobbyCode = socket.data.lobbyCode;
    if (!lobbyCode) return;

    const result = gameManager.clearSelection(lobbyCode, playerId);

    if ('error' in result) {
      return; // Silently fail
    }

    io.to(lobbyCode).emit('game:selectionChanged', {
      playerId,
      selectedCardIds: [],
    });
  });
}

/**
 * Handle when a player has selected a valid set.
 * Behavior depends on game settings (immediate vs click mode).
 */
function handleValidSet(
  io: TypedServer,
  lobbyCode: string,
  playerId: string,
  cardIds: string[]
): void {
  const gameState = gameManager.getGameState(lobbyCode);
  if (!gameState) return;

  const settings = gameState.settings;

  if (settings.setFoundBehavior === 'immediate') {
    // Immediately claim the set
    const result = gameManager.claimSet(lobbyCode, playerId, cardIds);

    if ('error' in result) {
      return;
    }

    io.to(lobbyCode).emit('game:setClaimed', {
      playerId,
      cardIds,
      pointsAwarded: result.pointsAwarded,
    });

    if (result.newCards.length > 0) {
      io.to(lobbyCode).emit('game:cardsDealt', {
        cards: result.newCards,
      });
    }

    if (result.gameEnded) {
      const finalState = gameManager.getGameState(lobbyCode);
      if (finalState) {
        io.to(lobbyCode).emit('game:ended', {
          reason: finalState.endReason || 'deck_empty',
          finalState,
        });
      }
    }
  } else {
    // 'click' mode - mark as pending, wait for confirmation
    gameManager.setPendingSet(lobbyCode, playerId, cardIds);

    io.to(lobbyCode).emit('game:setPending', {
      playerId,
      cardIds,
    });
  }
}

/**
 * Start a game from a lobby.
 * Called from the lobby handler when host starts the game.
 *
 * @param io - The Socket.IO server instance
 * @param lobbyCode - The lobby code to start the game for
 */
export function startGame(io: TypedServer, lobbyCode: string): void {
  const lobby = lobbyManager.getLobby(lobbyCode);
  if (!lobby) return;

  // Create the game state
  const gameState = createMultiplayerGame(lobby.players, lobby.settings);

  // Register the game with the game manager
  gameManager.createGame(lobbyCode, gameState);

  // Send initial game state to all players
  io.to(lobbyCode).emit('game:state', { state: gameState });

  // Start the game loop for timer updates if needed
  if (gameState.settings.turnTimer || gameState.settings.gameTimer) {
    gameManager.startGameLoop(lobbyCode, (state) => {
      io.to(lobbyCode).emit('game:timerUpdate', {
        turnTimeRemainingMs: state.turnTimeRemainingMs,
        gameTimeRemainingMs: state.gameTimeRemainingMs,
      });
    }, (state) => {
      io.to(lobbyCode).emit('game:ended', {
        reason: state.endReason || 'timer_expired',
        finalState: state,
      });
    });
  }

  console.log(`[Game] Started game for lobby ${lobbyCode} with ${lobby.players.length} players`);
}
