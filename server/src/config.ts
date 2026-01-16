/**
 * Server Configuration
 *
 * Centralized configuration with environment variable support.
 * Defaults are provided for local development.
 */

export const config = {
  /** Port the server listens on */
  port: parseInt(process.env.PORT || '3001', 10),

  /** URL of the client application (for CORS) */
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  /** Game tick rate in milliseconds (for timer updates) */
  tickRateMs: parseInt(process.env.TICK_RATE_MS || '100', 10),

  /** Maximum players per lobby */
  maxPlayersPerLobby: parseInt(process.env.MAX_PLAYERS || '8', 10),

  /** Lobby code length */
  lobbyCodeLength: parseInt(process.env.LOBBY_CODE_LENGTH || '6', 10),
} as const;
