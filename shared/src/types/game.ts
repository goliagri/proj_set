/**
 * Game State Types for Projective Set
 *
 * Defines the structure of game state, player state, and game settings.
 * These types are shared between client and server to ensure consistency.
 */

import { CardInstance, CardId } from './card';

// =============================================================================
// Player Types
// =============================================================================

/**
 * Unique identifier for a player in a game session.
 */
export type PlayerId = string;

/**
 * Player information and state within a game.
 */
export interface Player {
  id: PlayerId;
  name: string;
  /** Player number (1-indexed) for display purposes (P1, P2, etc.) */
  playerNumber: number;
  /** Player's assigned color for card selection highlighting */
  color: string;
  /** Cards the player has claimed (their "discard pile") */
  claimedCards: CardInstance[];
  /** IDs of cards currently selected by this player */
  selectedCardIds: CardId[];
  /** Current score based on scoring mode */
  score: number;
  /** Whether the player is connected (for multiplayer) */
  isConnected: boolean;
  /** Whether the player is ready (in lobby) */
  isReady: boolean;
}

// =============================================================================
// Game Settings
// =============================================================================

/**
 * Behavior when a valid set is found.
 * - 'immediate': Cards are claimed instantly when a valid set is selected
 * - 'click': Cards are locked but require a confirmation click to claim
 */
export type SetFoundBehavior = 'immediate' | 'click';

/**
 * Scoring mode for multiplayer games.
 * - 'cards': Score equals the number of cards in each claimed set
 * - 'sets': Each claimed set is worth 1 point regardless of size
 */
export type ScoringMode = 'cards' | 'sets';

/**
 * Timer configuration. Null means timer is disabled.
 */
export interface TimerConfig {
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Settings for a single-player game.
 */
export interface SinglePlayerSettings {
  /** Show colored dots (false = grey dots) */
  colorsEnabled: boolean;
  /** Show binary representation instead of dots */
  binaryMode: boolean;
  /** Per-set timer (resets after each set found) */
  turnTimer: TimerConfig | null;
  /** Total game timer */
  gameTimer: TimerConfig | null;
  /** Behavior when a valid set is selected */
  setFoundBehavior: SetFoundBehavior;
  /** Shuffle claimed cards back into deck (infinite play) */
  infiniteDeck: boolean;
}

/**
 * Settings for a multiplayer game.
 * Extends single-player settings with multiplayer-specific options.
 */
export interface MultiplayerSettings extends SinglePlayerSettings {
  /** How points are calculated */
  scoringMode: ScoringMode;
}

/**
 * Default settings for single-player games.
 */
export const DEFAULT_SINGLE_PLAYER_SETTINGS: SinglePlayerSettings = {
  colorsEnabled: true,
  binaryMode: false,
  turnTimer: null,
  gameTimer: null,
  setFoundBehavior: 'immediate',
  infiniteDeck: false,
};

/**
 * Default settings for multiplayer games.
 */
export const DEFAULT_MULTIPLAYER_SETTINGS: MultiplayerSettings = {
  ...DEFAULT_SINGLE_PLAYER_SETTINGS,
  scoringMode: 'cards',
};

// =============================================================================
// Game State
// =============================================================================

/**
 * Current phase of the game.
 */
export type GamePhase = 'waiting' | 'playing' | 'ended';

/**
 * Reason the game ended.
 */
export type GameEndReason =
  | 'deck_empty'      // Deck exhausted and no sets remain
  | 'timer_expired'   // Game or turn timer ran out
  | 'player_quit';    // Player left (single-player)

/**
 * Core game state shared between client and server.
 * This represents the authoritative state of the game.
 */
export interface GameState {
  /** Current game phase */
  phase: GamePhase;
  /** Cards remaining in the deck (order = deal order) */
  deck: CardInstance[];
  /** Cards currently on the table (active cards) */
  activeCards: CardInstance[];
  /** All players in the game */
  players: Player[];
  /** Game settings (frozen at game start) */
  settings: SinglePlayerSettings | MultiplayerSettings;
  /** Remaining time on turn timer (ms), null if not active */
  turnTimeRemainingMs: number | null;
  /** Remaining time on game timer (ms), null if not active */
  gameTimeRemainingMs: number | null;
  /** Reason the game ended, if applicable */
  endReason: GameEndReason | null;
  /** Timestamp when the game started */
  startedAt: number | null;
}

// =============================================================================
// Lobby State (Multiplayer)
// =============================================================================

/**
 * State of a multiplayer lobby before the game starts.
 */
export interface LobbyState {
  /** Unique lobby code for joining */
  code: string;
  /** ID of the host player */
  hostId: PlayerId;
  /** All players in the lobby */
  players: Player[];
  /** Current lobby settings (can be modified until game starts) */
  settings: MultiplayerSettings;
  /** Whether non-host players can modify settings */
  settingsUnlocked: boolean;
  /** Chat messages in the lobby */
  chatMessages: ChatMessage[];
}

/**
 * A chat message in the lobby or game.
 */
export interface ChatMessage {
  id: string;
  playerId: PlayerId;
  playerName: string;
  content: string;
  timestamp: number;
}
