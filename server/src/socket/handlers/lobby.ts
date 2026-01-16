/**
 * Lobby Event Handlers
 *
 * Handles all lobby-related socket events:
 * - Creating and joining lobbies
 * - Settings management
 * - Ready status and game start
 * - Chat messages
 */

import { TypedServer, TypedSocket } from '../index';
import { getPlayerId } from './connection';
import { lobbyManager } from '../../managers/LobbyManager';
import { ErrorCodes, Player, ChatMessage } from '@projective-set/shared';
import { generateChatMessageId } from '../../utils/ids';
import { startGame } from './game';

/**
 * Attach lobby event handlers to a socket.
 *
 * @param io - The Socket.IO server instance
 * @param socket - The socket to attach handlers to
 */
export function handleLobbyEvents(io: TypedServer, socket: TypedSocket): void {
  const playerId = getPlayerId(socket);
  if (!playerId) return;

  // =========================================================================
  // Create Lobby
  // =========================================================================
  socket.on('lobby:create', ({ playerName }) => {
    const lobby = lobbyManager.createLobby(playerId, playerName);

    // Join the Socket.IO room for this lobby
    socket.join(lobby.code);
    socket.data.lobbyCode = lobby.code;

    socket.emit('lobby:created', { lobby });
    console.log(`[Lobby] Created lobby ${lobby.code} by ${playerName}`);
  });

  // =========================================================================
  // Join Lobby
  // =========================================================================
  socket.on('lobby:join', ({ code, playerName }) => {
    const result = lobbyManager.joinLobby(code, playerId, playerName);

    if ('error' in result) {
      socket.emit('error', {
        code: result.error,
        message: result.message,
      });
      return;
    }

    const { lobby } = result;

    // Join the Socket.IO room
    socket.join(code);
    socket.data.lobbyCode = code;

    // Notify the joining player (for navigation)
    socket.emit('lobby:joined', { lobby });

    // Notify ALL players in the lobby with updated state
    io.to(code).emit('lobby:updated', { lobby });

    console.log(`[Lobby] ${playerName} joined lobby ${code}`);
  });

  // =========================================================================
  // Leave Lobby
  // =========================================================================
  socket.on('lobby:leave', () => {
    handlePlayerLeave(io, socket, playerId);
  });

  // =========================================================================
  // Update Settings
  // =========================================================================
  socket.on('lobby:updateSettings', ({ settings }) => {
    const lobbyCode = socket.data.lobbyCode;
    if (!lobbyCode) return;

    const result = lobbyManager.updateSettings(lobbyCode, playerId, settings);

    if ('error' in result) {
      socket.emit('error', {
        code: result.error,
        message: result.message,
      });
      return;
    }

    // Broadcast updated lobby state to all players
    io.to(lobbyCode).emit('lobby:updated', { lobby: result.lobby });
  });

  // =========================================================================
  // Toggle Settings Lock
  // =========================================================================
  socket.on('lobby:toggleSettingsLock', () => {
    const lobbyCode = socket.data.lobbyCode;
    if (!lobbyCode) return;

    const result = lobbyManager.toggleSettingsLock(lobbyCode, playerId);

    if ('error' in result) {
      socket.emit('error', {
        code: result.error,
        message: result.message,
      });
      return;
    }

    io.to(lobbyCode).emit('lobby:updated', { lobby: result.lobby });
  });

  // =========================================================================
  // Toggle Ready
  // =========================================================================
  socket.on('lobby:toggleReady', () => {
    const lobbyCode = socket.data.lobbyCode;
    if (!lobbyCode) return;

    const result = lobbyManager.toggleReady(lobbyCode, playerId);

    if ('error' in result) {
      socket.emit('error', {
        code: result.error,
        message: result.message,
      });
      return;
    }

    io.to(lobbyCode).emit('lobby:updated', { lobby: result.lobby });
  });

  // =========================================================================
  // Start Game
  // =========================================================================
  socket.on('lobby:startGame', () => {
    const lobbyCode = socket.data.lobbyCode;
    if (!lobbyCode) return;

    const result = lobbyManager.canStartGame(lobbyCode, playerId);

    if ('error' in result) {
      socket.emit('error', {
        code: result.error,
        message: result.message,
      });
      return;
    }

    // Notify all players that game is starting
    io.to(lobbyCode).emit('lobby:gameStarting');

    // Actually start the game
    startGame(io, lobbyCode);

    console.log(`[Lobby] Game started in lobby ${lobbyCode}`);
  });

  // =========================================================================
  // Get Current Lobby State (for rejoining after navigation)
  // =========================================================================
  socket.on('lobby:getState', () => {
    const lobbyCode = socket.data.lobbyCode;
    if (!lobbyCode) return;

    const lobby = lobbyManager.getLobby(lobbyCode);
    if (lobby) {
      socket.emit('lobby:updated', { lobby });
    }
  });

  // =========================================================================
  // Rejoin Lobby (after page refresh)
  // =========================================================================
  socket.on('lobby:rejoin', ({ code, playerName }) => {
    const result = lobbyManager.joinLobby(code, playerId, playerName);

    if ('error' in result) {
      socket.emit('error', {
        code: result.error,
        message: result.message,
      });
      return;
    }

    const { lobby } = result;

    // Join the Socket.IO room
    socket.join(code);
    socket.data.lobbyCode = code;

    // Notify ALL players in the lobby with updated state
    io.to(code).emit('lobby:updated', { lobby });

    console.log(`[Lobby] ${playerName} rejoined lobby ${code}`);
  });

  // =========================================================================
  // Chat Message
  // =========================================================================
  socket.on('lobby:chat', ({ content }) => {
    const lobbyCode = socket.data.lobbyCode;
    if (!lobbyCode) return;

    const player = lobbyManager.getPlayer(lobbyCode, playerId);
    if (!player) return;

    const message: ChatMessage = {
      id: generateChatMessageId(),
      playerId,
      playerName: player.name,
      content: content.substring(0, 500), // Limit message length
      timestamp: Date.now(),
    };

    lobbyManager.addChatMessage(lobbyCode, message);

    // Broadcast to all players in the lobby
    io.to(lobbyCode).emit('lobby:chatMessage', { message });
  });

  // =========================================================================
  // Handle Disconnect
  // =========================================================================
  socket.on('disconnect', () => {
    handlePlayerLeave(io, socket, playerId);
  });
}

/**
 * Handle a player leaving a lobby (either voluntarily or via disconnect).
 */
function handlePlayerLeave(
  io: TypedServer,
  socket: TypedSocket,
  playerId: string
): void {
  const lobbyCode = socket.data.lobbyCode;
  if (!lobbyCode) return;

  const result = lobbyManager.leaveLobby(lobbyCode, playerId);

  if ('error' in result) {
    return; // Silently fail, player wasn't in lobby
  }

  socket.leave(lobbyCode);
  socket.data.lobbyCode = undefined;

  if (result.lobbyDeleted) {
    console.log(`[Lobby] Lobby ${lobbyCode} deleted (last player left)`);
  } else {
    // Notify remaining players
    io.to(lobbyCode).emit('lobby:playerLeft', { playerId });

    // If host changed, send updated lobby state
    if (result.newHostId) {
      const lobby = lobbyManager.getLobby(lobbyCode);
      if (lobby) {
        io.to(lobbyCode).emit('lobby:updated', { lobby });
      }
    }

    console.log(`[Lobby] Player ${playerId} left lobby ${lobbyCode}`);
  }
}
