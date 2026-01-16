/**
 * SettingsPanel Component
 *
 * Configurable settings panel for single-player and multiplayer games.
 * Handles all game options: timers, display modes, scoring, etc.
 */

import { SinglePlayerSettings, MultiplayerSettings, ScoringMode } from '@projective-set/shared';
import './SettingsPanel.css';

interface SettingsPanelProps {
  /** Current settings */
  settings: SinglePlayerSettings | MultiplayerSettings;
  /** Called when settings change */
  onChange: (settings: any) => void;
  /** Whether this is for multiplayer (shows scoring mode) */
  isMultiplayer: boolean;
  /** Whether settings are disabled (non-host in locked lobby) */
  disabled?: boolean;
}

export function SettingsPanel({
  settings,
  onChange,
  isMultiplayer,
  disabled = false,
}: SettingsPanelProps) {
  const updateSetting = <K extends keyof SinglePlayerSettings>(
    key: K,
    value: SinglePlayerSettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className={`settings-panel ${disabled ? 'settings-panel--disabled' : ''}`}>
      {/* Colors Toggle */}
      <div className="setting-row">
        <label className="setting-label">
          <span>Colors</span>
          <span className="setting-description">Show colored dots on cards</span>
        </label>
        <button
          className={`toggle ${settings.colorsEnabled ? 'toggle--on' : ''}`}
          onClick={() => updateSetting('colorsEnabled', !settings.colorsEnabled)}
          disabled={disabled}
        >
          {settings.colorsEnabled ? 'On' : 'Off'}
        </button>
      </div>

      {/* Binary Mode Toggle */}
      <div className="setting-row">
        <label className="setting-label">
          <span>Binary Mode</span>
          <span className="setting-description">Show binary numbers instead of dots</span>
        </label>
        <button
          className={`toggle ${settings.binaryMode ? 'toggle--on' : ''}`}
          onClick={() => updateSetting('binaryMode', !settings.binaryMode)}
          disabled={disabled}
        >
          {settings.binaryMode ? 'On' : 'Off'}
        </button>
      </div>

      {/* Turn Timer */}
      <div className="setting-row">
        <label className="setting-label">
          <span>Turn Timer</span>
          <span className="setting-description">Time limit per set</span>
        </label>
        <div className="setting-input-group">
          <button
            className={`toggle ${settings.turnTimer ? 'toggle--on' : ''}`}
            onClick={() =>
              updateSetting(
                'turnTimer',
                settings.turnTimer ? null : { durationMs: 60000 }
              )
            }
            disabled={disabled}
          >
            {settings.turnTimer ? 'On' : 'Off'}
          </button>
          {settings.turnTimer && (
            <input
              type="number"
              min="10"
              max="300"
              value={Math.round(settings.turnTimer.durationMs / 1000)}
              onChange={(e) =>
                updateSetting('turnTimer', {
                  durationMs: parseInt(e.target.value) * 1000,
                })
              }
              disabled={disabled}
              className="setting-number-input"
            />
          )}
        </div>
      </div>

      {/* Game Timer */}
      <div className="setting-row">
        <label className="setting-label">
          <span>Game Timer</span>
          <span className="setting-description">Total time limit</span>
        </label>
        <div className="setting-input-group">
          <button
            className={`toggle ${settings.gameTimer ? 'toggle--on' : ''}`}
            onClick={() =>
              updateSetting(
                'gameTimer',
                settings.gameTimer ? null : { durationMs: 900000 }
              )
            }
            disabled={disabled}
          >
            {settings.gameTimer ? 'On' : 'Off'}
          </button>
          {settings.gameTimer && (
            <input
              type="number"
              min="60"
              max="3600"
              value={Math.round(settings.gameTimer.durationMs / 1000)}
              onChange={(e) =>
                updateSetting('gameTimer', {
                  durationMs: parseInt(e.target.value) * 1000,
                })
              }
              disabled={disabled}
              className="setting-number-input"
            />
          )}
        </div>
      </div>

      {/* Set Found Behavior */}
      <div className="setting-row">
        <label className="setting-label">
          <span>Set Found Behavior</span>
          <span className="setting-description">How sets are claimed</span>
        </label>
        <select
          value={settings.setFoundBehavior}
          onChange={(e) =>
            updateSetting('setFoundBehavior', e.target.value as 'immediate' | 'click')
          }
          disabled={disabled}
        >
          <option value="click">Take After Click</option>
          <option value="immediate">Take Immediately</option>
        </select>
      </div>

      {/* Infinite Deck */}
      <div className="setting-row">
        <label className="setting-label">
          <span>Infinite Deck</span>
          <span className="setting-description">Shuffle claimed cards back into deck</span>
        </label>
        <button
          className={`toggle ${settings.infiniteDeck ? 'toggle--on' : ''}`}
          onClick={() => updateSetting('infiniteDeck', !settings.infiniteDeck)}
          disabled={disabled}
        >
          {settings.infiniteDeck ? 'On' : 'Off'}
        </button>
      </div>

      {/* Multiplayer-only: Scoring Mode */}
      {isMultiplayer && (
        <div className="setting-row">
          <label className="setting-label">
            <span>Scoring Mode</span>
            <span className="setting-description">How points are calculated</span>
          </label>
          <select
            value={(settings as MultiplayerSettings).scoringMode || 'cards'}
            onChange={(e) =>
              onChange({ ...settings, scoringMode: e.target.value as ScoringMode })
            }
            disabled={disabled}
          >
            <option value="cards">Cards (points = cards in set)</option>
            <option value="sets">Sets (1 point per set)</option>
          </select>
        </div>
      )}
    </div>
  );
}
