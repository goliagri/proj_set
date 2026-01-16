/**
 * Multiplayer Game Page
 *
 * Main game screen for multiplayer mode.
 * Syncs state with server and handles real-time updates.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState, ChatMessage } from '@projective-set/shared';
import { useSocket } from '@/contexts/SocketContext';
import { GameBoard } from '@/components/game/GameBoard';
import { GameTimer } from '@/components/game/GameTimer';
import { Scoreboard } from '@/components/game/Scoreboard';
import { ChatBox } from '@/components/lobby/ChatBox';

// Tracks when a set was claimed for visual feedback
interface ClaimHighlight {
  playerId: string;
  color: string;
  timestamp: number;
  canDismiss: boolean; // True after 1 second
}

export function MultiplayerGame() {
  const navigate = useNavigate();
  const { socket, playerId } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [claimHighlight, setClaimHighlight] = useState<ClaimHighlight | null>(null);

  // Subscribe to game events
  useEffect(() => {
    if (!socket) return;

    // Initial state
    socket.on('game:state', ({ state }) => {
      setGameState(state);
    });

    // State updates
    socket.on('game:update', ({ patch }) => {
      setGameState(prev => prev ? { ...prev, ...patch } : null);
    });

    // Selection changes
    socket.on('game:selectionChanged', ({ playerId: pid, selectedCardIds }) => {
      setGameState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.map(p =>
            p.id === pid ? { ...p, selectedCardIds } : p
          ),
        };
      });
    });

    // Set claimed - remove cards from board, update player score and claimed cards
    socket.on('game:setClaimed', ({ playerId: pid, cardIds, pointsAwarded }) => {
      setGameState(prev => {
        if (!prev) return null;

        // Get the claimed cards before removing them
        const claimedCards = prev.activeCards.filter(c => cardIds.includes(c.id));

        // Get the claiming player's color for highlight
        const claimingPlayer = prev.players.find(p => p.id === pid);
        if (claimingPlayer) {
          setClaimHighlight({
            playerId: pid,
            color: claimingPlayer.color,
            timestamp: Date.now(),
            canDismiss: false,
          });
          // After 1 second, allow dismissal
          setTimeout(() => {
            setClaimHighlight(h => h && h.playerId === pid ? { ...h, canDismiss: true } : h);
          }, 1000);
        }

        return {
          ...prev,
          // Remove claimed cards from active cards
          activeCards: prev.activeCards.filter(c => !cardIds.includes(c.id)),
          // Update the player who claimed
          players: prev.players.map(p => {
            if (p.id === pid) {
              return {
                ...p,
                score: p.score + pointsAwarded,
                claimedCards: [...p.claimedCards, ...claimedCards],
                selectedCardIds: [], // Clear selection after claiming
              };
            }
            return p;
          }),
        };
      });
    });

    // New cards dealt - add them to the board
    socket.on('game:cardsDealt', ({ cards }) => {
      setGameState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          activeCards: [...prev.activeCards, ...cards.map(c => ({ id: c.id, value: c.value }))],
        };
      });
    });

    // Timer updates
    socket.on('game:timerUpdate', ({ turnTimeRemainingMs, gameTimeRemainingMs }) => {
      setGameState(prev => prev ? {
        ...prev,
        turnTimeRemainingMs,
        gameTimeRemainingMs,
      } : null);
    });

    // Game ended
    socket.on('game:ended', ({ finalState }) => {
      sessionStorage.setItem('gameResult', JSON.stringify(finalState));
      navigate('/gameover');
    });

    // Chat messages
    socket.on('lobby:chatMessage', ({ message }) => {
      setChatMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('game:state');
      socket.off('game:update');
      socket.off('game:selectionChanged');
      socket.off('game:setClaimed');
      socket.off('game:cardsDealt');
      socket.off('game:timerUpdate');
      socket.off('game:ended');
      socket.off('lobby:chatMessage');
    };
  }, [socket, navigate]);

  // Handle card selection
  const handleCardClick = (cardId: string) => {
    // If there's a claim highlight and this is the claimer clicking
    if (claimHighlight && claimHighlight.playerId === playerId && claimHighlight.canDismiss) {
      setClaimHighlight(null);
    }
    // Don't allow clicks during forced wait period
    if (claimHighlight && !claimHighlight.canDismiss) {
      return;
    }
    socket?.emit('game:toggleCard', { cardId });
  };

  // Handle set confirmation
  const handleConfirmSet = () => {
    socket?.emit('game:confirmSet');
  };

  if (!gameState) {
    return <div className="page">Loading game...</div>;
  }

  return (
    <div className="page multiplayer-game">
      <div className="game-header">
        {(gameState.turnTimeRemainingMs !== null || gameState.gameTimeRemainingMs !== null) && (
          <GameTimer
            turnTimeMs={gameState.turnTimeRemainingMs}
            gameTimeMs={gameState.gameTimeRemainingMs}
          />
        )}
      </div>

      <div className="game-main">
        <GameBoard
          activeCards={gameState.activeCards}
          players={gameState.players}
          currentPlayerId={playerId || ''}
          settings={gameState.settings}
          deckCount={gameState.deck.length}
          claimHighlight={claimHighlight ? { color: claimHighlight.color } : undefined}
          onCardClick={handleCardClick}
          onConfirmSet={handleConfirmSet}
        />

        <div className="game-sidebar">
          <Scoreboard players={gameState.players} />

          <ChatBox
            messages={chatMessages}
            players={gameState.players}
            onSendMessage={(content) => {
              socket?.emit('lobby:chat', { content });
            }}
          />
        </div>
      </div>
    </div>
  );
}
