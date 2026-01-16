/**
 * ID Generation Utilities
 *
 * Functions for generating unique identifiers for players, lobbies, and messages.
 */

import { config } from '../config';

/**
 * Characters used for lobby codes.
 * Uppercase letters and numbers, excluding ambiguous characters (0, O, I, 1, L).
 */
const LOBBY_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a unique player ID.
 * Uses timestamp + random for uniqueness.
 */
export function generatePlayerId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `player_${timestamp}_${random}`;
}

/**
 * Generate a unique lobby code.
 * Uses uppercase alphanumeric characters for easy sharing.
 *
 * @param length - Length of the code (default from config)
 */
export function generateLobbyCode(length: number = config.lobbyCodeLength): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += LOBBY_CODE_CHARS.charAt(
      Math.floor(Math.random() * LOBBY_CODE_CHARS.length)
    );
  }
  return code;
}

/**
 * Generate a unique chat message ID.
 */
export function generateChatMessageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `msg_${timestamp}_${random}`;
}
