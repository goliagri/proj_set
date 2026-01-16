/**
 * PlayerList Component
 *
 * Displays players in a lobby with their ready status.
 * Highlights the host and current player.
 */

import { Player } from '@projective-set/shared';
import './PlayerList.css';

interface PlayerListProps {
  /** All players in the lobby */
  players: Player[];
  /** ID of the host player */
  hostId: string;
  /** ID of the current user */
  currentPlayerId: string;
}

export function PlayerList({ players, hostId, currentPlayerId }: PlayerListProps) {
  return (
    <div className="player-list">
      <h3 className="player-list__title">Players</h3>
      <ul className="player-list__items">
        {players.map((player) => (
          <li
            key={player.id}
            className={`player-list__item ${
              player.id === currentPlayerId ? 'player-list__item--current' : ''
            }`}
          >
            <span
              className="player-list__color"
              style={{ backgroundColor: player.color }}
            />
            <span className="player-list__name">
              P{player.playerNumber}: {player.name}
              {player.id === hostId && (
                <span className="player-list__badge player-list__badge--host">
                  Host
                </span>
              )}
              {player.id === currentPlayerId && (
                <span className="player-list__badge player-list__badge--you">
                  You
                </span>
              )}
            </span>
            <span
              className={`player-list__status ${
                player.isReady ? 'player-list__status--ready' : ''
              }`}
            >
              {player.isReady ? 'Ready' : 'Not Ready'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
