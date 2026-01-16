/**
 * Main Menu Page
 *
 * Entry point of the application. Provides navigation to:
 * - Single player game
 * - Multiplayer game
 * - About page
 */

import { useNavigate } from 'react-router-dom';

export function MainMenu() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <h1 className="page-title">Projective Set</h1>

      <div className="menu">
        <button
          className="btn btn-primary menu-item"
          onClick={() => navigate('/singleplayer')}
        >
          Single Player
        </button>

        <button
          className="btn btn-primary menu-item"
          onClick={() => navigate('/multiplayer')}
        >
          Multiplayer
        </button>

        <button
          className="btn btn-secondary menu-item"
          onClick={() => navigate('/about')}
        >
          About
        </button>
      </div>
    </div>
  );
}
