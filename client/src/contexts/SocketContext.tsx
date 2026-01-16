/**
 * Socket Context
 *
 * Provides Socket.IO client connection to the entire application.
 * Manages connection lifecycle and provides typed socket instance.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientEvents, ServerEvents } from '@projective-set/shared';

/**
 * Typed socket instance for type-safe event emission.
 */
export type TypedSocket = Socket<ServerEvents, ClientEvents>;

/**
 * Socket context value.
 */
interface SocketContextValue {
  /** The socket instance (null if not connected) */
  socket: TypedSocket | null;
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** The player's ID assigned by the server */
  playerId: string | null;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  playerId: null,
});

/**
 * Server URL - uses relative path in production (same origin)
 * or localhost in development.
 */
const SERVER_URL = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3001';

/**
 * Socket provider component.
 * Creates and manages the socket connection.
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    // Create socket connection
    const socketInstance: TypedSocket = io(SERVER_URL, {
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Handle connection events
    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connection:established', ({ playerId }) => {
      console.log('[Socket] Player ID assigned:', playerId);
      setPlayerId(playerId);
    });

    socketInstance.on('error', ({ code, message }) => {
      console.error('[Socket] Error:', code, message);
      // TODO: Show error toast or notification
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, playerId }}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook to access the socket context.
 */
export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
