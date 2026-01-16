/**
 * Game Over Page
 *
 * Displays game results:
 * - Winner(s)
 * - Final scores
 * - Game statistics
 * - Option to play again or return to menu
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState, getWinners } from '@projective-set/shared';

export function GameOver() {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Load game result from session storage
  useEffect(() => {
    const resultJson = sessionStorage.getItem('gameResult');
    if (resultJson) {
      setGameState(JSON.parse(resultJson));
    }
  }, []);

  if (!gameState) {
    return (
      <div className="page">
        <p>No game data found.</p>
        <button className="btn btn-primary mt-lg" onClick={() => navigate('/')}>
          Return to Menu
        </button>
      </div>
    );
  }

  const winners = getWinners(gameState);
  const isMultiplayer = gameState.players.length > 1;

  return (
    <div className="page">
      <div className="page-content">
        {/* Scoreboard */}
        <div className="scoreboard-final">
          <h3 className="mb-md">Final Scores</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 'var(--spacing-sm)' }}>Player</th>
                <th style={{ textAlign: 'right', padding: 'var(--spacing-sm)' }}>Score</th>
                <th style={{ textAlign: 'right', padding: 'var(--spacing-sm)' }}>Cards</th>
              </tr>
            </thead>
            <tbody>
              {gameState.players
                .sort((a, b) => b.score - a.score)
                .map((player) => (
                  <tr
                    key={player.id}
                    style={{
                      backgroundColor: winners.some(w => w.id === player.id)
                        ? 'var(--color-bg-card)'
                        : 'transparent',
                    }}
                  >
                    <td style={{ padding: 'var(--spacing-sm)' }}>
                      <span style={{ color: player.color }}>●</span> {player.name}
                      {winners.some(w => w.id === player.id) && ' 👑'}
                    </td>
                    <td style={{ textAlign: 'right', padding: 'var(--spacing-sm)' }}>
                      {player.score}
                    </td>
                    <td style={{ textAlign: 'right', padding: 'var(--spacing-sm)' }}>
                      {player.claimedCards.length}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex gap-md mt-xl justify-center">
          <button
            className="btn btn-primary"
            onClick={() => navigate(isMultiplayer ? '/multiplayer' : '/singleplayer')}
          >
            Play Again
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
