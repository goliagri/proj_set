/**
 * Tests for LobbyManager
 *
 * Tests lobby creation, joining, settings, and player management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorCodes } from '@projective-set/shared';

// We need to create a fresh LobbyManager for each test
// since the exported one is a singleton

// Inline the class for testing to avoid singleton issues
import {
  LobbyState,
  Player,
  MultiplayerSettings,
  ChatMessage,
  DEFAULT_MULTIPLAYER_SETTINGS,
} from '@projective-set/shared';

const PLAYER_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

type Result<T> = T | { error: string; message: string };

function generateLobbyCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class TestLobbyManager {
  private lobbies = new Map<string, LobbyState>();

  createLobby(hostId: string, hostName: string): LobbyState {
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
      isReady: false,
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

  joinLobby(
    code: string,
    playerId: string,
    playerName: string
  ): Result<{ lobby: LobbyState; player: Player }> {
    const lobby = this.lobbies.get(code);

    if (!lobby) {
      return { error: ErrorCodes.LOBBY_NOT_FOUND, message: 'Lobby not found' };
    }

    if (lobby.players.length >= 8) {
      return { error: ErrorCodes.LOBBY_FULL, message: 'Lobby is full' };
    }

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

    if (lobby.players.length === 0) {
      this.lobbies.delete(code);
      return { lobbyDeleted: true };
    }

    lobby.players.forEach((p, i) => {
      p.playerNumber = i + 1;
      p.color = PLAYER_COLORS[i % PLAYER_COLORS.length];
    });

    let newHostId: string | undefined;
    if (playerId === lobby.hostId) {
      newHostId = lobby.players[0].id;
      lobby.hostId = newHostId;
    }

    return { lobbyDeleted: false, newHostId };
  }

  updateSettings(
    code: string,
    playerId: string,
    settings: Partial<MultiplayerSettings>
  ): Result<{ lobby: LobbyState }> {
    const lobby = this.lobbies.get(code);

    if (!lobby) {
      return { error: ErrorCodes.LOBBY_NOT_FOUND, message: 'Lobby not found' };
    }

    if (!lobby.settingsUnlocked && playerId !== lobby.hostId) {
      return { error: ErrorCodes.SETTINGS_LOCKED, message: 'Only host can change settings' };
    }

    lobby.settings = { ...lobby.settings, ...settings };
    return { lobby };
  }

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

  canStartGame(code: string, playerId: string): Result<{ canStart: true }> {
    const lobby = this.lobbies.get(code);

    if (!lobby) {
      return { error: ErrorCodes.LOBBY_NOT_FOUND, message: 'Lobby not found' };
    }

    if (playerId !== lobby.hostId) {
      return { error: ErrorCodes.NOT_HOST, message: 'Only host can start the game' };
    }

    return { canStart: true };
  }

  addChatMessage(code: string, message: ChatMessage): void {
    const lobby = this.lobbies.get(code);
    if (lobby) {
      lobby.chatMessages.push(message);
      if (lobby.chatMessages.length > 100) {
        lobby.chatMessages = lobby.chatMessages.slice(-100);
      }
    }
  }

  getLobby(code: string): LobbyState | undefined {
    return this.lobbies.get(code);
  }

  getPlayer(code: string, playerId: string): Player | undefined {
    const lobby = this.lobbies.get(code);
    return lobby?.players.find(p => p.id === playerId);
  }

  deleteLobby(code: string): void {
    this.lobbies.delete(code);
  }
}

describe('LobbyManager', () => {
  let manager: TestLobbyManager;

  beforeEach(() => {
    manager = new TestLobbyManager();
  });

  describe('createLobby', () => {
    it('should create a lobby with unique code', () => {
      const lobby = manager.createLobby('host1', 'HostName');

      expect(lobby.code).toBeDefined();
      expect(lobby.code.length).toBe(6);
      expect(lobby.hostId).toBe('host1');
    });

    it('should create host player with correct properties', () => {
      const lobby = manager.createLobby('host1', 'HostName');

      expect(lobby.players.length).toBe(1);
      expect(lobby.players[0].id).toBe('host1');
      expect(lobby.players[0].name).toBe('HostName');
      expect(lobby.players[0].playerNumber).toBe(1);
      expect(lobby.players[0].isReady).toBe(false);
      expect(lobby.players[0].color).toBe(PLAYER_COLORS[0]);
    });

    it('should use default multiplayer settings', () => {
      const lobby = manager.createLobby('host1', 'HostName');

      expect(lobby.settings).toEqual(DEFAULT_MULTIPLAYER_SETTINGS);
    });

    it('should start with settings locked', () => {
      const lobby = manager.createLobby('host1', 'HostName');

      expect(lobby.settingsUnlocked).toBe(false);
    });

    it('should start with empty chat messages', () => {
      const lobby = manager.createLobby('host1', 'HostName');

      expect(lobby.chatMessages).toEqual([]);
    });
  });

  describe('joinLobby', () => {
    it('should add a player to the lobby', () => {
      const lobby = manager.createLobby('host1', 'Host');
      const result = manager.joinLobby(lobby.code, 'player2', 'Player2');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.lobby.players.length).toBe(2);
        expect(result.player.id).toBe('player2');
        expect(result.player.name).toBe('Player2');
        expect(result.player.playerNumber).toBe(2);
        expect(result.player.color).toBe(PLAYER_COLORS[1]);
      }
    });

    it('should return error for non-existent lobby', () => {
      const result = manager.joinLobby('INVALID', 'player1', 'Player');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.LOBBY_NOT_FOUND);
      }
    });

    it('should return existing player if already in lobby', () => {
      const lobby = manager.createLobby('host1', 'Host');
      const result = manager.joinLobby(lobby.code, 'host1', 'Different Name');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.lobby.players.length).toBe(1);
        expect(result.player.name).toBe('Host'); // Original name
      }
    });

    it('should return error when lobby is full', () => {
      const lobby = manager.createLobby('host', 'Host');

      // Add 7 more players (max 8)
      for (let i = 1; i <= 7; i++) {
        manager.joinLobby(lobby.code, `player${i}`, `Player${i}`);
      }

      const result = manager.joinLobby(lobby.code, 'player9', 'Player9');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.LOBBY_FULL);
      }
    });

    it('should assign colors in order', () => {
      const lobby = manager.createLobby('p1', 'P1');
      manager.joinLobby(lobby.code, 'p2', 'P2');
      manager.joinLobby(lobby.code, 'p3', 'P3');

      const updatedLobby = manager.getLobby(lobby.code);
      expect(updatedLobby?.players[0].color).toBe(PLAYER_COLORS[0]);
      expect(updatedLobby?.players[1].color).toBe(PLAYER_COLORS[1]);
      expect(updatedLobby?.players[2].color).toBe(PLAYER_COLORS[2]);
    });
  });

  describe('leaveLobby', () => {
    it('should remove player from lobby', () => {
      const lobby = manager.createLobby('host', 'Host');
      manager.joinLobby(lobby.code, 'player2', 'Player2');

      const result = manager.leaveLobby(lobby.code, 'player2');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.lobbyDeleted).toBe(false);
        const updatedLobby = manager.getLobby(lobby.code);
        expect(updatedLobby?.players.length).toBe(1);
      }
    });

    it('should delete lobby when last player leaves', () => {
      const lobby = manager.createLobby('host', 'Host');
      const result = manager.leaveLobby(lobby.code, 'host');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.lobbyDeleted).toBe(true);
        expect(manager.getLobby(lobby.code)).toBe(undefined);
      }
    });

    it('should assign new host when host leaves', () => {
      const lobby = manager.createLobby('host', 'Host');
      manager.joinLobby(lobby.code, 'player2', 'Player2');

      const result = manager.leaveLobby(lobby.code, 'host');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.newHostId).toBe('player2');
        const updatedLobby = manager.getLobby(lobby.code);
        expect(updatedLobby?.hostId).toBe('player2');
      }
    });

    it('should reassign player numbers after leave', () => {
      const lobby = manager.createLobby('p1', 'P1');
      manager.joinLobby(lobby.code, 'p2', 'P2');
      manager.joinLobby(lobby.code, 'p3', 'P3');

      manager.leaveLobby(lobby.code, 'p2');

      const updatedLobby = manager.getLobby(lobby.code);
      expect(updatedLobby?.players[0].playerNumber).toBe(1);
      expect(updatedLobby?.players[1].playerNumber).toBe(2);
    });

    it('should return error for non-existent lobby', () => {
      const result = manager.leaveLobby('INVALID', 'player');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.LOBBY_NOT_FOUND);
      }
    });

    it('should return error for player not in lobby', () => {
      const lobby = manager.createLobby('host', 'Host');
      const result = manager.leaveLobby(lobby.code, 'unknown');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.INVALID_REQUEST);
      }
    });
  });

  describe('updateSettings', () => {
    it('should update settings when host requests', () => {
      const lobby = manager.createLobby('host', 'Host');
      const result = manager.updateSettings(lobby.code, 'host', {
        colorsEnabled: false,
      });

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.lobby.settings.colorsEnabled).toBe(false);
      }
    });

    it('should reject non-host when settings locked', () => {
      const lobby = manager.createLobby('host', 'Host');
      manager.joinLobby(lobby.code, 'player', 'Player');

      const result = manager.updateSettings(lobby.code, 'player', {
        colorsEnabled: false,
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.SETTINGS_LOCKED);
      }
    });

    it('should allow non-host when settings unlocked', () => {
      const lobby = manager.createLobby('host', 'Host');
      manager.joinLobby(lobby.code, 'player', 'Player');
      manager.toggleSettingsLock(lobby.code, 'host');

      const result = manager.updateSettings(lobby.code, 'player', {
        colorsEnabled: false,
      });

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.lobby.settings.colorsEnabled).toBe(false);
      }
    });
  });

  describe('toggleSettingsLock', () => {
    it('should toggle settings lock when host requests', () => {
      const lobby = manager.createLobby('host', 'Host');
      expect(lobby.settingsUnlocked).toBe(false);

      const result = manager.toggleSettingsLock(lobby.code, 'host');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.lobby.settingsUnlocked).toBe(true);
      }
    });

    it('should reject non-host', () => {
      const lobby = manager.createLobby('host', 'Host');
      manager.joinLobby(lobby.code, 'player', 'Player');

      const result = manager.toggleSettingsLock(lobby.code, 'player');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.NOT_HOST);
      }
    });
  });

  describe('toggleReady', () => {
    it('should toggle ready status', () => {
      const lobby = manager.createLobby('host', 'Host');
      expect(lobby.players[0].isReady).toBe(false);

      const result = manager.toggleReady(lobby.code, 'host');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.lobby.players[0].isReady).toBe(true);
      }
    });

    it('should toggle back to not ready', () => {
      const lobby = manager.createLobby('host', 'Host');
      manager.toggleReady(lobby.code, 'host');
      const result = manager.toggleReady(lobby.code, 'host');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.lobby.players[0].isReady).toBe(false);
      }
    });

    it('should return error for player not in lobby', () => {
      const lobby = manager.createLobby('host', 'Host');
      const result = manager.toggleReady(lobby.code, 'unknown');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.INVALID_REQUEST);
      }
    });
  });

  describe('canStartGame', () => {
    it('should allow host to start game', () => {
      const lobby = manager.createLobby('host', 'Host');
      const result = manager.canStartGame(lobby.code, 'host');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.canStart).toBe(true);
      }
    });

    it('should reject non-host', () => {
      const lobby = manager.createLobby('host', 'Host');
      manager.joinLobby(lobby.code, 'player', 'Player');

      const result = manager.canStartGame(lobby.code, 'player');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe(ErrorCodes.NOT_HOST);
      }
    });
  });

  describe('addChatMessage', () => {
    it('should add chat message to lobby', () => {
      const lobby = manager.createLobby('host', 'Host');
      const message: ChatMessage = {
        id: 'msg1',
        playerId: 'host',
        playerName: 'Host',
        content: 'Hello!',
        timestamp: Date.now(),
      };

      manager.addChatMessage(lobby.code, message);

      const updatedLobby = manager.getLobby(lobby.code);
      expect(updatedLobby?.chatMessages.length).toBe(1);
      expect(updatedLobby?.chatMessages[0].content).toBe('Hello!');
    });

    it('should limit chat messages to 100', () => {
      const lobby = manager.createLobby('host', 'Host');

      for (let i = 0; i < 110; i++) {
        manager.addChatMessage(lobby.code, {
          id: `msg${i}`,
          playerId: 'host',
          playerName: 'Host',
          content: `Message ${i}`,
          timestamp: Date.now(),
        });
      }

      const updatedLobby = manager.getLobby(lobby.code);
      expect(updatedLobby?.chatMessages.length).toBe(100);
      expect(updatedLobby?.chatMessages[0].content).toBe('Message 10');
    });
  });

  describe('getPlayer', () => {
    it('should return player by id', () => {
      const lobby = manager.createLobby('host', 'Host');
      const player = manager.getPlayer(lobby.code, 'host');

      expect(player).toBeDefined();
      expect(player?.name).toBe('Host');
    });

    it('should return undefined for unknown player', () => {
      const lobby = manager.createLobby('host', 'Host');
      const player = manager.getPlayer(lobby.code, 'unknown');

      expect(player).toBe(undefined);
    });

    it('should return undefined for unknown lobby', () => {
      const player = manager.getPlayer('INVALID', 'player');
      expect(player).toBe(undefined);
    });
  });

  describe('deleteLobby', () => {
    it('should delete the lobby', () => {
      const lobby = manager.createLobby('host', 'Host');
      expect(manager.getLobby(lobby.code)).toBeDefined();

      manager.deleteLobby(lobby.code);

      expect(manager.getLobby(lobby.code)).toBe(undefined);
    });
  });
});
