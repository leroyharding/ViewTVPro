import { useState, useCallback } from 'react';
import type { AppSettings } from '../types';

const STORAGE_KEY = 'leeviewtvpro_settings';

const defaultSettings: AppSettings = {
  rdToken: '',
  rdManualKey: '',
  iptvUrl: '',
  iptvType: 'm3u',
  xtreamHost: '',
  xtreamUser: '',
  xtreamPass: '',
  preferredPlayer: 'web',
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSettings;
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
