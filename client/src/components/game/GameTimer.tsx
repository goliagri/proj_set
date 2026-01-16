/**
 * GameTimer Component
 *
 * Displays turn timer and/or game timer.
 * Changes color when time is running low.
 */

import './GameTimer.css';

interface GameTimerProps {
  /** Remaining turn time in milliseconds (null if not active) */
  turnTimeMs: number | null;
  /** Remaining game time in milliseconds (null if not active) */
  gameTimeMs: number | null;
}

/**
 * Format milliseconds to MM:SS display.
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get urgency class based on remaining time.
 */
function getUrgencyClass(ms: number): string {
  if (ms <= 10000) return 'timer--critical'; // 10 seconds or less
  if (ms <= 30000) return 'timer--warning';  // 30 seconds or less
  return '';
}

export function GameTimer({ turnTimeMs, gameTimeMs }: GameTimerProps) {
  return (
    <div className="game-timers">
      {turnTimeMs !== null && (
        <div className={`timer timer--turn ${getUrgencyClass(turnTimeMs)}`}>
          <span className="timer__label">Turn</span>
          <span className="timer__value">{formatTime(turnTimeMs)}</span>
        </div>
      )}

      {gameTimeMs !== null && (
        <div className={`timer timer--game ${getUrgencyClass(gameTimeMs)}`}>
          <span className="timer__label">Game</span>
          <span className="timer__value">{formatTime(gameTimeMs)}</span>
        </div>
      )}
    </div>
  );
}
