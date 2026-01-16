/**
 * Socket.IO Server Initialization
 *
 * Sets up the Socket.IO server with proper CORS configuration
 * and connects event handlers.
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config';
import { handleConnection } from './handlers/connection';
import { handleLobbyEvents } from './handlers/lobby';
import { handleGameEvents } from './handlers/game';
import { ClientEvents, ServerEvents } from '@projective-set/shared';

/**
 * Typed Socket.IO server instance.
 */
export type TypedServer = Server<ClientEvents, ServerEvents>;
export type TypedSocket = Socket<ClientEvents, ServerEvents>;

let io: TypedServer;

/**
 * Initialize the Socket.IO server and attach event handlers.
 *
 * @param httpServer - The HTTP server to attach Socket.IO to
 * @returns The Socket.IO server instance
 */
export function initializeSocketServer(httpServer: HttpServer): TypedServer {
  io = new Server<ClientEvents, ServerEvents>(httpServer, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Ping settings for connection health
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: TypedSocket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Handle initial connection
    handleConnection(io, socket);

    // Attach event handlers
    handleLobbyEvents(io, socket);
    handleGameEvents(io, socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`);
      // Cleanup is handled in individual handlers via their own disconnect logic
    });
  });

  console.log('[Socket] Socket.IO server initialized');
  return io;
}

/**
 * Get the Socket.IO server instance.
 * Useful for emitting events from outside the handler context.
 */
export function getIO(): TypedServer {
  if (!io) {
    throw new Error('Socket.IO server not initialized');
  }
  return io;
}
