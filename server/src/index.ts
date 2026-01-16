/**
 * Projective Set Game Server
 *
 * Entry point for the multiplayer game server.
 * Sets up Express for health checks and Socket.IO for real-time game communication.
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { initializeSocketServer } from './socket';
import { config } from './config';

// =============================================================================
// Server Setup
// =============================================================================

const app = express();
const httpServer = createServer(app);

// Enable CORS for the client
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

// Health check endpoint (useful for deployment)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Initialize Socket.IO server
initializeSocketServer(httpServer);

// =============================================================================
// Start Server
// =============================================================================

httpServer.listen(config.port, () => {
  console.log(`[Server] Projective Set server running on port ${config.port}`);
  console.log(`[Server] Client URL: ${config.clientUrl}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});
