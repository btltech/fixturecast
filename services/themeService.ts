interface ThemeSettings {
  mode: 'light' | 'dark' | 'auto';
  accentColor: string;
  useDynamicBackgrounds: boolean;
}

interface TimezoneSettings {
  timezone: string;
  dateFormat: 'short' | 'medium' | 'long';
  timeFormat: '12h' | '24h';
}

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  colorBlindFriendly: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'auto',
  accentColor: '#3b82f6',
  useDynamicBackgrounds: true,
};

const DEFAULT_TIMEZONE_SETTINGS: TimezoneSettings = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
  dateFormat: 'medium',
  timeFormat: '24h',
};

const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  colorBlindFriendly: false,
  screenReader: false,
  keyboardNavigation: true,
  fontSize: 'medium',
};

const STORAGE_KEYS = {
  THEME: 'fixturecast_theme_settings',
  TIMEZONE: 'fixturecast_timezone_settings',
  ACCESSIBILITY: 'fixturecast_accessibility_settings',
};

const SAFE_STORAGE: Storage | null = typeof window !== 'undefined' ? window.localStorage : null;

function readFromStorage<T>(key: string, fallback: T): T {
  try {
    if (!SAFE_STORAGE) return fallback;
    const raw = SAFE_STORAGE.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch (error) {
    console.warn(`[themeService] Failed to read ${key} from storage`, error);
    return fallback;
  }
}

function writeToStorage<T>(key: string, value: T) {
  try {
    if (!SAFE_STORAGE) return;
    SAFE_STORAGE.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[themeService] Failed to write ${key} to storage`, error);
  }
}

const themeService = {
  getThemeSettings(): ThemeSettings {
    return readFromStorage(STORAGE_KEYS.THEME, DEFAULT_THEME_SETTINGS);
  },

  updateThemeSettings(updates: Partial<ThemeSettings>) {
    const merged = { ...this.getThemeSettings(), ...updates };
    writeToStorage(STORAGE_KEYS.THEME, merged);
    this.applyThemeSettings(merged);
  },

  applyThemeSettings(settings: ThemeSettings) {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.theme = settings.mode;
    document.documentElement.style.setProperty('--accent-color', settings.accentColor);

    if (settings.useDynamicBackgrounds) {
      document.documentElement.classList.add('dynamic-backgrounds');
    } else {
      document.documentElement.classList.remove('dynamic-backgrounds');
    }
  },

  getTimezoneSettings(): TimezoneSettings {
    return readFromStorage(STORAGE_KEYS.TIMEZONE, DEFAULT_TIMEZONE_SETTINGS);
  },

  updateTimezoneSettings(updates: Partial<TimezoneSettings>) {
    const merged = { ...this.getTimezoneSettings(), ...updates };
    writeToStorage(STORAGE_KEYS.TIMEZONE, merged);
  },

  getAvailableTimezones(): string[] {
    try {
      if (typeof Intl?.supportedValuesOf === 'function') {
        return Intl.supportedValuesOf('timeZone');
      }
    } catch (error) {
      console.warn('[themeService] unable to fetch supported time zones', error);
    }
    return ['UTC', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles'];
  },

  getAccessibilitySettings(): AccessibilitySettings {
    return readFromStorage(STORAGE_KEYS.ACCESSIBILITY, DEFAULT_ACCESSIBILITY_SETTINGS);
  },

  updateAccessibilitySettings(updates: Partial<AccessibilitySettings>) {
    const merged = { ...this.getAccessibilitySettings(), ...updates };
    writeToStorage(STORAGE_KEYS.ACCESSIBILITY, merged);
    this.applyAccessibilitySettings(merged);
  },

  applyAccessibilitySettings(settings: AccessibilitySettings) {
    if (typeof document === 'undefined') return;

    document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
    document.documentElement.classList.toggle('high-contrast', settings.highContrast);
    document.documentElement.classList.toggle('color-blind-friendly', settings.colorBlindFriendly);
    document.documentElement.style.setProperty('--base-font-size', this.getFontSizeValue(settings.fontSize));
  },

  getFontSizeValue(size: AccessibilitySettings['fontSize']): string {
    switch (size) {
      case 'small':
        return '14px';
      case 'large':
        return '18px';
      case 'medium':
      default:
        return '16px';
    }
  },
};

export { themeService };


