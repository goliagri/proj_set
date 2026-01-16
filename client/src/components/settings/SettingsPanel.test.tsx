/**
 * Tests for SettingsPanel Component
 *
 * Tests all settings toggles, inputs, and their interactions.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';
import {
  DEFAULT_SINGLE_PLAYER_SETTINGS,
  DEFAULT_MULTIPLAYER_SETTINGS,
  SinglePlayerSettings,
  MultiplayerSettings,
} from '@projective-set/shared';

describe('SettingsPanel', () => {
  describe('colors toggle', () => {
    it('should show "On" when colors are enabled', () => {
      render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={() => {}}
          isMultiplayer={false}
        />
      );

      const colorsRow = screen.getByText('Colors').closest('.setting-row');
      expect(colorsRow).toHaveTextContent('On');
    });

    it('should show "Off" when colors are disabled', () => {
      const settings = { ...DEFAULT_SINGLE_PLAYER_SETTINGS, colorsEnabled: false };

      render(
        <SettingsPanel
          settings={settings}
          onChange={() => {}}
          isMultiplayer={false}
        />
      );

      const colorsRow = screen.getByText('Colors').closest('.setting-row');
      expect(colorsRow).toHaveTextContent('Off');
    });

    it('should call onChange with toggled colorsEnabled when clicked', () => {
      const handleChange = vi.fn();

      render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={handleChange}
          isMultiplayer={false}
        />
      );

      const colorsRow = screen.getByText('Colors').closest('.setting-row');
      const toggle = colorsRow?.querySelector('.toggle');
      fireEvent.click(toggle!);

      expect(handleChange).toHaveBeenCalledWith({
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        colorsEnabled: false,
      });
    });
  });

  describe('binary mode toggle', () => {
    it('should show "Off" by default', () => {
      render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={() => {}}
          isMultiplayer={false}
        />
      );

      const binaryRow = screen.getByText('Binary Mode').closest('.setting-row');
      expect(binaryRow).toHaveTextContent('Off');
    });

    it('should call onChange with toggled binaryMode when clicked', () => {
      const handleChange = vi.fn();

      render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={handleChange}
          isMultiplayer={false}
        />
      );

      const binaryRow = screen.getByText('Binary Mode').closest('.setting-row');
      const toggle = binaryRow?.querySelector('.toggle');
      fireEvent.click(toggle!);

      expect(handleChange).toHaveBeenCalledWith({
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        binaryMode: true,
      });
    });
  });

  describe('turn timer', () => {
    it('should show "Off" when timer is null', () => {
      render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={() => {}}
          isMultiplayer={false}
        />
      );

      const timerRow = screen.getByText('Turn Timer').closest('.setting-row');
      expect(timerRow).toHaveTextContent('Off');
    });

    it('should show "On" and duration input when timer is enabled', () => {
      const settings = {
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        turnTimer: { durationMs: 60000 },
      };

      render(
        <SettingsPanel
          settings={settings}
          onChange={() => {}}
          isMultiplayer={false}
        />
      );

      const timerRow = screen.getByText('Turn Timer').closest('.setting-row');
      expect(timerRow).toHaveTextContent('On');

      const input = timerRow?.querySelector('input[type="number"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(60);
    });

    it('should enable timer with default 60 seconds when toggled on', () => {
      const handleChange = vi.fn();

      render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={handleChange}
          isMultiplayer={false}
        />
      );

      const timerRow = screen.getByText('Turn Timer').closest('.setting-row');
      const toggle = timerRow?.querySelector('.toggle');
      fireEvent.click(toggle!);

      expect(handleChange).toHaveBeenCalledWith({
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        turnTimer: { durationMs: 60000 },
      });
    });

    it('should update duration when input changes', () => {
      const handleChange = vi.fn();
      const settings = {
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        turnTimer: { durationMs: 60000 },
      };

      render(
        <SettingsPanel
          settings={settings}
          onChange={handleChange}
          isMultiplayer={false}
        />
      );

      const timerRow = screen.getByText('Turn Timer').closest('.setting-row');
      const input = timerRow?.querySelector('input[type="number"]');
      fireEvent.change(input!, { target: { value: '90' } });

      expect(handleChange).toHaveBeenCalledWith({
        ...settings,
        turnTimer: { durationMs: 90000 },
      });
    });
  });

  describe('game timer', () => {
    it('should enable timer with default 15 minutes when toggled on', () => {
      const handleChange = vi.fn();

      render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={handleChange}
          isMultiplayer={false}
        />
      );

      const timerRow = screen.getByText('Game Timer').closest('.setting-row');
      const toggle = timerRow?.querySelector('.toggle');
      fireEvent.click(toggle!);

      expect(handleChange).toHaveBeenCalledWith({
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        gameTimer: { durationMs: 900000 }, // 15 minutes
      });
    });
  });

  describe('set found behavior', () => {
    it('should show "Take After Click" by default', () => {
      const settings = {
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        setFoundBehavior: 'click' as const,
      };

      render(
        <SettingsPanel
          settings={settings}
          onChange={() => {}}
          isMultiplayer={false}
        />
      );

      const select = screen.getByDisplayValue('Take After Click');
      expect(select).toBeInTheDocument();
    });

    it('should call onChange when selection changes', () => {
      const handleChange = vi.fn();

      render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={handleChange}
          isMultiplayer={false}
        />
      );

      const select = screen.getByDisplayValue('Take Immediately');
      fireEvent.change(select, { target: { value: 'click' } });

      expect(handleChange).toHaveBeenCalledWith({
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        setFoundBehavior: 'click',
      });
    });
  });

  describe('infinite deck toggle', () => {
    it('should show "Off" by default', () => {
      render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={() => {}}
          isMultiplayer={false}
        />
      );

      const infiniteRow = screen.getByText('Infinite Deck').closest('.setting-row');
      expect(infiniteRow).toHaveTextContent('Off');
    });

    it('should call onChange with toggled infiniteDeck when clicked', () => {
      const handleChange = vi.fn();

      render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={handleChange}
          isMultiplayer={false}
        />
      );

      const infiniteRow = screen.getByText('Infinite Deck').closest('.setting-row');
      const toggle = infiniteRow?.querySelector('.toggle');
      fireEvent.click(toggle!);

      expect(handleChange).toHaveBeenCalledWith({
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        infiniteDeck: true,
      });
    });
  });

  describe('scoring mode (multiplayer only)', () => {
    it('should not show scoring mode in single player', () => {
      render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={() => {}}
          isMultiplayer={false}
        />
      );

      expect(screen.queryByText('Scoring Mode')).not.toBeInTheDocument();
    });

    it('should show scoring mode in multiplayer', () => {
      render(
        <SettingsPanel
          settings={DEFAULT_MULTIPLAYER_SETTINGS}
          onChange={() => {}}
          isMultiplayer={true}
        />
      );

      expect(screen.getByText('Scoring Mode')).toBeInTheDocument();
    });

    it('should call onChange when scoring mode changes', () => {
      const handleChange = vi.fn();

      render(
        <SettingsPanel
          settings={DEFAULT_MULTIPLAYER_SETTINGS}
          onChange={handleChange}
          isMultiplayer={true}
        />
      );

      const scoringRow = screen.getByText('Scoring Mode').closest('.setting-row');
      const select = scoringRow?.querySelector('select');
      fireEvent.change(select!, { target: { value: 'sets' } });

      expect(handleChange).toHaveBeenCalledWith({
        ...DEFAULT_MULTIPLAYER_SETTINGS,
        scoringMode: 'sets',
      });
    });
  });

  describe('disabled state', () => {
    it('should disable all inputs when disabled prop is true', () => {
      const { container } = render(
        <SettingsPanel
          settings={DEFAULT_MULTIPLAYER_SETTINGS}
          onChange={() => {}}
          isMultiplayer={true}
          disabled={true}
        />
      );

      const toggles = container.querySelectorAll('.toggle');
      toggles.forEach(toggle => {
        expect(toggle).toBeDisabled();
      });

      const selects = container.querySelectorAll('select');
      selects.forEach(select => {
        expect(select).toBeDisabled();
      });
    });

    it('should add disabled class to panel when disabled', () => {
      const { container } = render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={() => {}}
          isMultiplayer={false}
          disabled={true}
        />
      );

      expect(container.querySelector('.settings-panel--disabled')).toBeInTheDocument();
    });

    it('should not add disabled class when not disabled', () => {
      const { container } = render(
        <SettingsPanel
          settings={DEFAULT_SINGLE_PLAYER_SETTINGS}
          onChange={() => {}}
          isMultiplayer={false}
          disabled={false}
        />
      );

      expect(container.querySelector('.settings-panel--disabled')).not.toBeInTheDocument();
    });
  });

  describe('timer input validation', () => {
    it('should have min and max constraints on turn timer input', () => {
      const settings = {
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        turnTimer: { durationMs: 60000 },
      };

      render(
        <SettingsPanel
          settings={settings}
          onChange={() => {}}
          isMultiplayer={false}
        />
      );

      const timerRow = screen.getByText('Turn Timer').closest('.setting-row');
      const input = timerRow?.querySelector('input[type="number"]');

      expect(input).toHaveAttribute('min', '10');
      expect(input).toHaveAttribute('max', '300');
    });

    it('should have min and max constraints on game timer input', () => {
      const settings = {
        ...DEFAULT_SINGLE_PLAYER_SETTINGS,
        gameTimer: { durationMs: 900000 },
      };

      render(
        <SettingsPanel
          settings={settings}
          onChange={() => {}}
          isMultiplayer={false}
        />
      );

      const timerRow = screen.getByText('Game Timer').closest('.setting-row');
      const input = timerRow?.querySelector('input[type="number"]');

      expect(input).toHaveAttribute('min', '60');
      expect(input).toHaveAttribute('max', '3600');
    });
  });
});
