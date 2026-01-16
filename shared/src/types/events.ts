/**
 * Socket Event Types for Projective Set
 *
 * Defines all events that can be sent between client and server.
 * Using strongly-typed events prevents protocol mismatches.
 */

import { CardId } from './card';
import {
  GameState,
  LobbyState,
  MultiplayerSettings,
  PlayerId,
  Player,
  ChatMessage,
} from './game';

// =============================================================================
// Client -> Server Events
// =============================================================================

/**
 * Events sent from client to server.
 */
export interface ClientEvents {
  // --- Lobby Events ---

  /** Create a new multiplayer lobby */
  'lobby:create': (data: { playerName: string }) => void;

  /** Join an existing lobby */
  'lobby:join': (data: { code: string; playerName: string }) => void;

  /** Leave the current lobby */
  'lobby:leave': () => void;

  /** Update lobby settings (host or if unlocked) */
  'lobby:updateSettings': (data: { settings: Partial<MultiplayerSettings> }) => void;

  /** Toggle settings lock (host only) */
  'lobby:toggleSettingsLock': () => void;

  /** Toggle ready status */
  'lobby:toggleReady': () => void;

  /** Start the game (host only, all players must be ready) */
  'lobby:startGame': () => void;

  /** Send a chat message */
  'lobby:chat': (data: { content: string }) => void;

  /** Request current lobby state (for rejoining after navigation) */
  'lobby:getState': () => void;

  /** Rejoin a lobby after page refresh */
  'lobby:rejoin': (data: { code: string; playerName: string }) => void;

  // --- Game Events ---

  /** Select or deselect a card */
  'game:toggleCard': (data: { cardId: CardId }) => void;

  /** Confirm set claim (in 'click' mode) */
  'game:confirmSet': () => void;

  /** Clear current selection */
  'game:clearSelection': () => void;
}

// =============================================================================
// Server -> Client Events
// =============================================================================

/**
 * Events sent from server to client.
 */
export interface ServerEvents {
  // --- Connection Events ---

  /** Acknowledge successful connection */
  'connection:established': (data: { playerId: PlayerId }) => void;

  /** Report an error to the client */
  'error': (data: { code: string; message: string }) => void;

  // --- Lobby Events ---

  /** Lobby was successfully created */
  'lobby:created': (data: { lobby: LobbyState }) => void;

  /** Successfully joined a lobby */
  'lobby:joined': (data: { lobby: LobbyState }) => void;

  /** Lobby state updated (settings, players, etc.) */
  'lobby:updated': (data: { lobby: LobbyState }) => void;

  /** A player joined the lobby */
  'lobby:playerJoined': (data: { player: Player }) => void;

  /** A player left the lobby */
  'lobby:playerLeft': (data: { playerId: PlayerId }) => void;

  /** New chat message received */
  'lobby:chatMessage': (data: { message: ChatMessage }) => void;

  /** Game is starting */
  'lobby:gameStarting': () => void;

  // --- Game Events ---

  /** Full game state sync (on join or reconnect) */
  'game:state': (data: { state: GameState }) => void;

  /** Partial game state update */
  'game:update': (data: { patch: Partial<GameState> }) => void;

  /** A player's selection changed */
  'game:selectionChanged': (data: {
    playerId: PlayerId;
    selectedCardIds: CardId[];
  }) => void;

  /** A player claimed a set */
  'game:setClaimed': (data: {
    playerId: PlayerId;
    cardIds: CardId[];
    pointsAwarded: number;
  }) => void;

  /** A player has a pending set (in 'click' mode) */
  'game:setPending': (data: {
    playerId: PlayerId;
    cardIds: CardId[];
  }) => void;

  /** New cards were dealt */
  'game:cardsDealt': (data: { cards: { id: CardId; value: number }[] }) => void;

  /** Timer tick update */
  'game:timerUpdate': (data: {
    turnTimeRemainingMs: number | null;
    gameTimeRemainingMs: number | null;
  }) => void;

  /** Game has ended */
  'game:ended': (data: {
    reason: string;
    finalState: GameState;
  }) => void;
}

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Standard error codes for client-server communication.
 */
export const ErrorCodes = {
  // Lobby errors
  LOBBY_NOT_FOUND: 'LOBBY_NOT_FOUND',
  LOBBY_FULL: 'LOBBY_FULL',
  LOBBY_GAME_IN_PROGRESS: 'LOBBY_GAME_IN_PROGRESS',
  NOT_HOST: 'NOT_HOST',
  SETTINGS_LOCKED: 'SETTINGS_LOCKED',
  PLAYERS_NOT_READY: 'PLAYERS_NOT_READY',

  // Game errors
  GAME_NOT_STARTED: 'GAME_NOT_STARTED',
  INVALID_CARD: 'INVALID_CARD',
  CARD_ALREADY_CLAIMED: 'CARD_ALREADY_CLAIMED',
  NOT_A_VALID_SET: 'NOT_A_VALID_SET',
  NO_PENDING_SET: 'NO_PENDING_SET',

  // General errors
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
