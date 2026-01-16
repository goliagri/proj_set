/**
 * Single Player Settings Page
 *
 * Configures game settings before starting a single-player game:
 * - Colors enabled/disabled
 * - Binary mode
 * - Turn timer
 * - Game timer
 * - Set found behavior (immediate vs click)
 * - Infinite deck
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SinglePlayerSettings as SettingsType, DEFAULT_SINGLE_PLAYER_SETTINGS } from '@projective-set/shared';
import { SettingsPanel } from '@/components/settings/SettingsPanel';

export function SinglePlayerSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SINGLE_PLAYER_SETTINGS);

  const handleStart = () => {
    // Store settings in session storage for the game page to read
    sessionStorage.setItem('singlePlayerSettings', JSON.stringify(settings));
    navigate('/singleplayer/game');
  };

  return (
    <div className="page">
      <h1 className="page-title">Single Player Settings</h1>

      <div className="page-content">
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          isMultiplayer={false}
        />

        <div className="flex gap-md mt-xl justify-center">
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Back
          </button>

          <button
            className="btn btn-primary"
            onClick={handleStart}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}
