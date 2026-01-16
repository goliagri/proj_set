/**
 * Main Application Component
 *
 * Sets up routing between different screens:
 * - Main Menu
 * - Single Player (Settings -> Game -> Game Over)
 * - Multiplayer (Menu -> Lobby -> Game -> Game Over)
 * - About
 */

import { Routes, Route } from 'react-router-dom';

// Pages
import { MainMenu } from './pages/MainMenu';
import { SinglePlayerSettings } from './pages/SinglePlayerSettings';
import { SinglePlayerGame } from './pages/SinglePlayerGame';
import { MultiplayerMenu } from './pages/MultiplayerMenu';
import { MultiplayerLobby } from './pages/MultiplayerLobby';
import { MultiplayerGame } from './pages/MultiplayerGame';
import { GameOver } from './pages/GameOver';
import { About } from './pages/About';

/**
 * Root application component with route definitions.
 */
export function App() {
  return (
    <div className="app">
      <Routes>
        {/* Main Menu */}
        <Route path="/" element={<MainMenu />} />

        {/* Single Player Flow */}
        <Route path="/singleplayer" element={<SinglePlayerSettings />} />
        <Route path="/singleplayer/game" element={<SinglePlayerGame />} />

        {/* Multiplayer Flow */}
        <Route path="/multiplayer" element={<MultiplayerMenu />} />
        <Route path="/multiplayer/lobby/:code?" element={<MultiplayerLobby />} />
        <Route path="/multiplayer/game" element={<MultiplayerGame />} />

        {/* Shared */}
        <Route path="/gameover" element={<GameOver />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
}
