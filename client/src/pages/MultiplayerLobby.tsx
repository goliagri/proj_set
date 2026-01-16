/**
 * Multiplayer Lobby Page
 *
 * Waiting room before the game starts:
 * - Shows lobby code for others to join
 * - Player list with ready status
 * - Settings panel (host or unlocked)
 * - Chat functionality
 * - Ready/Start buttons
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LobbyState, MultiplayerSettings } from '@projective-set/shared';
import { useSocket } from '@/contexts/SocketContext';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { PlayerList } from '@/components/lobby/PlayerList';
import { ChatBox } from '@/components/lobby/ChatBox';

export function MultiplayerLobby() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const { socket, playerId } = useSocket();
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [rejoinAttempted, setRejoinAttempted] = useState(false);

  // Subscribe to lobby updates
  useEffect(() => {
    if (!socket) return;

    // Handle lobby state updates
    const handleLobbyUpdate = ({ lobby }: { lobby: LobbyState }) => {
      setLobby(lobby);
    };

    // Handle errors (e.g., lobby not found on rejoin)
    const handleError = ({ message }: { code: string; message: string }) => {
      console.error('[Lobby] Error:', message);
      // If rejoin failed, redirect to menu
      if (rejoinAttempted) {
        navigate('/multiplayer');
      }
    };

    socket.on('lobby:updated', handleLobbyUpdate);
    socket.on('lobby:joined', handleLobbyUpdate);
    socket.on('lobby:created', handleLobbyUpdate);
    socket.on('error', handleError);

    // Handle new chat messages
    socket.on('lobby:chatMessage', ({ message }) => {
      setLobby(prev => {
        if (!prev) return null;
        return {
          ...prev,
          chatMessages: [...prev.chatMessages, message],
        };
      });
    });

    // Handle game starting
    socket.on('lobby:gameStarting', () => {
      navigate('/multiplayer/game');
    });

    // Request current lobby state in case we missed the creation event
    socket.emit('lobby:getState');

    return () => {
      socket.off('lobby:updated', handleLobbyUpdate);
      socket.off('lobby:joined', handleLobbyUpdate);
      socket.off('lobby:created', handleLobbyUpdate);
      socket.off('error', handleError);
      socket.off('lobby:chatMessage');
      socket.off('lobby:gameStarting');
    };
  }, [socket, navigate, rejoinAttempted]);

  // Attempt to rejoin if we have no lobby state after a short delay
  useEffect(() => {
    if (!socket || lobby || rejoinAttempted) return;

    const timer = setTimeout(() => {
      const storedName = sessionStorage.getItem('playerName');
      if (code && storedName) {
        setRejoinAttempted(true);
        socket.emit('lobby:rejoin', { code, playerName: storedName });
      } else if (code) {
        // No stored name, redirect to menu to enter name
        navigate('/multiplayer');
      }
    }, 500); // Wait a bit for lobby:getState to potentially return

    return () => clearTimeout(timer);
  }, [socket, lobby, code, rejoinAttempted, navigate]);

  const handleSettingsChange = (settings: MultiplayerSettings) => {
    socket?.emit('lobby:updateSettings', { settings });
  };

  const handleToggleReady = () => {
    socket?.emit('lobby:toggleReady');
  };

  const handleStartGame = () => {
    socket?.emit('lobby:startGame');
  };

  const handleLeave = () => {
    socket?.emit('lobby:leave');
    navigate('/multiplayer');
  };

  if (!lobby) {
    return <div className="page">Loading lobby...</div>;
  }

  const isHost = playerId === lobby.hostId;
  const canEditSettings = isHost || lobby.settingsUnlocked;
  const currentPlayer = lobby.players.find(p => p.id === playerId);
  const allReady = lobby.players.every(p => p.isReady);

  return (
    <div className="page">
      <div className="lobby-header">
        <button className="btn btn-secondary" onClick={handleLeave}>
          Back
        </button>
        <div className="lobby-code">
          <span>Lobby Code: </span>
          <strong>{lobby.code}</strong>
        </div>
      </div>

      <div className="lobby-content">
        {/* Left side: Players and Chat */}
        <div className="lobby-left">
          <PlayerList
            players={lobby.players}
            hostId={lobby.hostId}
            currentPlayerId={playerId || ''}
          />

          <ChatBox
            messages={lobby.chatMessages}
            players={lobby.players}
            onSendMessage={(content) => {
              socket?.emit('lobby:chat', { content });
            }}
          />
        </div>

        {/* Right side: Settings */}
        <div className="lobby-right">
          <SettingsPanel
            settings={lobby.settings}
            onChange={handleSettingsChange}
            isMultiplayer={true}
            disabled={!canEditSettings}
          />

          {isHost && (
            <button
              className="btn btn-secondary mt-md"
              onClick={() => socket?.emit('lobby:toggleSettingsLock')}
            >
              {lobby.settingsUnlocked ? 'Lock Settings' : 'Unlock Settings'}
            </button>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="lobby-footer">
        <button
          className="btn btn-primary"
          onClick={handleToggleReady}
        >
          {currentPlayer?.isReady ? 'Not Ready' : 'Ready'}
        </button>

        {isHost && (
          <button
            className="btn btn-primary"
            onClick={handleStartGame}
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}
