/**
 * Multiplayer Menu Page
 *
 * Entry point for multiplayer mode:
 * - Create a new lobby
 * - Join an existing lobby by code
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/contexts/SocketContext';

export function MultiplayerMenu() {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [lobbyCode, setLobbyCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreateLobby = () => {
    if (!socket || !playerName.trim()) return;

    const name = playerName.trim();
    sessionStorage.setItem('playerName', name);
    socket.emit('lobby:create', { playerName: name });

    // Listen for lobby creation response
    socket.once('lobby:created', ({ lobby }) => {
      navigate(`/multiplayer/lobby/${lobby.code}`);
    });
  };

  const handleJoinLobby = () => {
    if (!socket || !lobbyCode.trim() || !playerName.trim()) return;

    const name = playerName.trim();
    sessionStorage.setItem('playerName', name);
    socket.emit('lobby:join', {
      code: lobbyCode.trim().toUpperCase(),
      playerName: name,
    });

    // Listen for join response
    socket.once('lobby:joined', ({ lobby }) => {
      navigate(`/multiplayer/lobby/${lobby.code}`);
    });

    socket.once('error', ({ message }) => {
      setError(message);
    });
  };

  return (
    <div className="page">
      <h1 className="page-title">Multiplayer</h1>

      <div className="page-content">
        {!isConnected && (
          <p className="text-center mb-lg" style={{ color: 'var(--color-warning)' }}>
            Connecting to server...
          </p>
        )}

        {/* Player Name Input */}
        <div className="mb-lg">
          <label htmlFor="playerName">Your Name</label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
          />
        </div>

        {/* Create Lobby */}
        <div className="mb-xl">
          <button
            className="btn btn-primary"
            onClick={handleCreateLobby}
            disabled={!isConnected || !playerName.trim()}
            style={{ width: '100%' }}
          >
            Create Lobby
          </button>
        </div>

        {/* Join Lobby */}
        <div className="mb-lg">
          <label htmlFor="lobbyCode">Lobby Code</label>
          <input
            id="lobbyCode"
            type="text"
            value={lobbyCode}
            onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
            placeholder="Enter lobby code"
            maxLength={6}
            style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleJoinLobby}
          disabled={!isConnected || !lobbyCode.trim() || !playerName.trim()}
          style={{ width: '100%' }}
        >
          Join Lobby
        </button>

        {error && (
          <p className="text-center mt-md" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        )}

        <div className="mt-xl text-center">
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
