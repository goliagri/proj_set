/**
 * Scoreboard Component
 *
 * Displays player scores during multiplayer games.
 * Shows point animations when players claim sets.
 */

import { Player } from '@projective-set/shared';
import './Scoreboard.css';

interface ScoreboardProps {
  /** All players in the game */
  players: Player[];
}

export function Scoreboard({ players }: ScoreboardProps) {
  // Sort by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="scoreboard">
      <h3 className="scoreboard__title">Scores</h3>
      <ul className="scoreboard__list">
        {sortedPlayers.map((player) => (
          <li key={player.id} className="scoreboard__item">
            <span
              className="scoreboard__color"
              style={{ backgroundColor: player.color }}
            />
            <span className="scoreboard__name">
              P{player.playerNumber}: {player.name}
            </span>
            <span className="scoreboard__score">{player.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
