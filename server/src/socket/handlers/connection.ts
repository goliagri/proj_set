/**
 * Connection Handler
 *
 * Handles initial socket connection and player ID assignment.
 */

import { TypedServer, TypedSocket } from '../index';
import { generatePlayerId } from '../../utils/ids';

/**
 * Store of socket ID -> player ID mappings.
 * This allows reconnection logic if implemented later.
 */
const socketToPlayer = new Map<string, string>();

/**
 * Handle a new socket connection.
 * Assigns a player ID and sends it to the client.
 *
 * @param _io - The Socket.IO server instance
 * @param socket - The connecting socket
 */
export function handleConnection(_io: TypedServer, socket: TypedSocket): void {
  // Generate or retrieve player ID
  const playerId = generatePlayerId();
  socketToPlayer.set(socket.id, playerId);

  // Store player ID on socket for easy access in other handlers
  socket.data.playerId = playerId;

  // Notify client of their player ID
  socket.emit('connection:established', { playerId });

  console.log(`[Connection] Player ${playerId} connected via socket ${socket.id}`);

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    socketToPlayer.delete(socket.id);
    console.log(`[Connection] Player ${playerId} disconnected`);
  });
}

/**
 * Get the player ID for a socket.
 *
 * @param socket - The socket to look up
 * @returns The player ID, or undefined if not found
 */
export function getPlayerId(socket: TypedSocket): string | undefined {
  return socket.data.playerId;
}
