/**
 * Lobby Manager
 *
 * Manages all active lobbies and their state.
 * Handles lobby creation, joining, settings, and ready status.
 */

import {
  LobbyState,
  Player,
  MultiplayerSettings,
  ChatMessage,
  DEFAULT_MULTIPLAYER_SETTINGS,
  ErrorCodes,
} from '@projective-set/shared';
import { generateLobbyCode } from '../utils/ids';
import { config } from '../config';

/**
 * Player colors for visual distinction.
 * Assigned in order as players join.
 */
const PLAYER_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

/**
 * Result type for operations that can fail.
 */
type Result<T> = T | { error: string; message: string };

/**
 * Manages all active game lobbies.
 */
class LobbyManager {
  /** Map of lobby code -> lobby state */
  private lobbies = new Map<string, LobbyState>();

  /**
   * Create a new lobby with the given player as host.
   *
   * @param hostId - Player ID of the host
   * @param hostName - Display name of the host
   * @returns The created lobby state
   */
  createLobby(hostId: string, hostName: string): LobbyState {
    // Generate a unique lobby code
    let code: string;
    do {
      code = generateLobbyCode();
    } while (this.lobbies.has(code));

    const host: Player = {
      id: hostId,
      name: hostName,
      playerNumber: 1,
      color: PLAYER_COLORS[0],
      claimedCards: [],
      selectedCardIds: [],
      score: 0,
      isConnected: true,
      isReady: false, // Host must also ready up
    };

    const lobby: LobbyState = {
      code,
      hostId,
      players: [host],
      settings: { ...DEFAULT_MULTIPLAYER_SETTINGS },
      settingsUnlocked: false,
      chatMessages: [],
    };

    this.lobbies.set(code, lobby);
    return lobby;
  }

  /**
   * Add a player to an existing lobby.
   *
   * @param code - Lobby code to join
   * @param playerId - Player ID of the joining player
   * @param playerName - Display name of the joining player
   * @returns The updated lobby and new player, or error
   */
  joinLobby(
    code: string,
    playerId: string,
    playerName: string
  ): Result<{ lobby: LobbyState; player: Player }> {
    const lobby = this.lobbies.get(code);

    if (!lobby) {
      return {
        error: ErrorCodes.LOBBY_NOT_FOUND,
        message: 'Lobby not found',
      };
    }

    if (lobby.players.length >= config.maxPlayersPerLobby) {
      return {
        error: ErrorCodes.LOBBY_FULL,
        message: 'Lobby is full',
      };
    }

    // Check if player is already in lobby
    if (lobby.players.some(p => p.id === playerId)) {
      return { lobby, player: lobby.players.find(p => p.id === playerId)! };
    }

    const playerNumber = lobby.players.length + 1;
    const player: Player = {
      id: playerId,
      name: playerName,
      playerNumber,
      color: PLAYER_COLORS[(playerNumber - 1) % PLAYER_COLORS.length],
      claimedCards: [],
      selectedCardIds: [],
      score: 0,
      isConnected: true,
      isReady: false,
    };

    lobby.players.push(player);
    return { lobby, player };
  }

  /**
   * Remove a player from a lobby.
   *
   * @param code - Lobby code
   * @param playerId - Player ID to remove
   * @returns Result indicating if lobby was deleted or new host assigned
   */
  leaveLobby(
    code: string,
    playerId: string
  ): Result<{ lobbyDeleted: boolean; newHostId?: string }> {
    const lobby = this.lobbies.get(code);

    if (!lobby) {
      return { error: ErrorCodes.LOBBY_NOT_FOUND, message: 'Lobby not found' };
    }

    const playerIndex = lobby.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { error: ErrorCodes.INVALID_REQUEST, message: 'Player not in lobby' };
    }

    lobby.players.splice(playerIndex, 1);

    // If lobby is now empty, delete it
    if (lobby.players.length === 0) {
      this.lobbies.delete(code);
      return { lobbyDeleted: true };
    }

    // Reassign player numbers
    lobby.players.forEach((p, i) => {
      p.playerNumber = i + 1;
      p.color = PLAYER_COLORS[i % PLAYER_COLORS.length];
    });

    // If host left, assign new host
    let newHostId: string | undefined;
    if (playerId === lobby.hostId) {
      newHostId = lobby.players[0].id;
      lobby.hostId = newHostId;
    }

    return { lobbyDeleted: false, newHostId };
  }

  /**
   * Update lobby settings.
   *
   * @param code - Lobby code
   * @param playerId - Player making the change
   * @param settings - Partial settings to update
   * @returns Updated lobby or error
   */
  updateSettings(
    code: string,
    playerId: string,
    settings: Partial<MultiplayerSettings>
  ): Result<{ lobby: LobbyState }> {
    const lobby = this.lobbies.get(code);

    if (!lobby) {
      return { error: ErrorCodes.LOBBY_NOT_FOUND, message: 'Lobby not found' };
    }

    // Check if player can modify settings
    if (!lobby.settingsUnlocked && playerId !== lobby.hostId) {
      return { error: ErrorCodes.SETTINGS_LOCKED, message: 'Only host can change settings' };
    }

    // Merge settings
    lobby.settings = { ...lobby.settings, ...settings };

    return { lobby };
  }

  /**
   * Toggle the settings lock (host only).
   */
  toggleSettingsLock(code: string, playerId: string): Result<{ lobby: LobbyState }> {
    const lobby = this.lobbies.get(code);

    if (!lobby) {
      return { error: ErrorCodes.LOBBY_NOT_FOUND, message: 'Lobby not found' };
    }

    if (playerId !== lobby.hostId) {
      return { error: ErrorCodes.NOT_HOST, message: 'Only host can toggle settings lock' };
    }

    lobby.settingsUnlocked = !lobby.settingsUnlocked;
    return { lobby };
  }

  /**
   * Toggle a player's ready status.
   */
  toggleReady(code: string, playerId: string): Result<{ lobby: LobbyState }> {
    const lobby = this.lobbies.get(code);

    if (!lobby) {
      return { error: ErrorCodes.LOBBY_NOT_FOUND, message: 'Lobby not found' };
    }

    const player = lobby.players.find(p => p.id === playerId);
    if (!player) {
      return { error: ErrorCodes.INVALID_REQUEST, message: 'Player not in lobby' };
    }

    player.isReady = !player.isReady;
    return { lobby };
  }

  /**
   * Check if the game can be started.
   *
   * @param code - Lobby code
   * @param playerId - Player attempting to start (must be host)
   * @returns Success or error
   */
  canStartGame(code: string, playerId: string): Result<{ canStart: true }> {
    const lobby = this.lobbies.get(code);

    if (!lobby) {
      return { error: ErrorCodes.LOBBY_NOT_FOUND, message: 'Lobby not found' };
    }

    if (playerId !== lobby.hostId) {
      return { error: ErrorCodes.NOT_HOST, message: 'Only host can start the game' };
    }

    // Host can start game regardless of ready status
    return { canStart: true };
  }

  /**
   * Add a chat message to the lobby.
   */
  addChatMessage(code: string, message: ChatMessage): void {
    const lobby = this.lobbies.get(code);
    if (lobby) {
      lobby.chatMessages.push(message);
      // Keep only last 100 messages
      if (lobby.chatMessages.length > 100) {
        lobby.chatMessages = lobby.chatMessages.slice(-100);
      }
    }
  }

  /**
   * Get a lobby by code.
   */
  getLobby(code: string): LobbyState | undefined {
    return this.lobbies.get(code);
  }

  /**
   * Get a player from a lobby.
   */
  getPlayer(code: string, playerId: string): Player | undefined {
    const lobby = this.lobbies.get(code);
    return lobby?.players.find(p => p.id === playerId);
  }

  /**
   * Delete a lobby (called when game ends or all players leave).
   */
  deleteLobby(code: string): void {
    this.lobbies.delete(code);
  }
}

// Export singleton instance
export const lobbyManager = new LobbyManager();
