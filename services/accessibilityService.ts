interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  colorScheme: 'default' | 'high-contrast' | 'colorblind-friendly' | 'dark-high-contrast';
  reducedMotion: boolean;
  screenReader: boolean;
  touchTargetSize: 'small' | 'medium' | 'large' | 'extra-large';
  focusIndicators: boolean;
  keyboardNavigation: boolean;
}

interface ColorBlindFriendlyColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

class AccessibilityService {
  private static instance: AccessibilityService;
  private settings: AccessibilitySettings;
  private colorBlindFriendlyColors: ColorBlindFriendlyColors;

  constructor() {
    this.settings = this.loadSettings();
    this.colorBlindFriendlyColors = this.getColorBlindFriendlyColors();
    this.applySettings();
  }

  static getInstance(): AccessibilityService {
    if (!AccessibilityService.instance) {
      AccessibilityService.instance = new AccessibilityService();
    }
    return AccessibilityService.instance;
  }

  private loadSettings(): AccessibilitySettings {
    if (typeof window === 'undefined') {
      return this.getDefaultSettings();
    }

    try {
      const stored = localStorage.getItem('accessibility-settings');
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load accessibility settings:', error);
    }

    return this.getDefaultSettings();
  }

  private getDefaultSettings(): AccessibilitySettings {
    return {
      fontSize: 'medium',
      colorScheme: 'default',
      reducedMotion: false,
      screenReader: false,
      touchTargetSize: 'medium',
      focusIndicators: true,
      keyboardNavigation: true
    };
  }

  private getColorBlindFriendlyColors(): ColorBlindFriendlyColors {
    return {
      primary: '#0066CC',      // Blue - distinguishable for all colorblind types
      secondary: '#666666',   // Gray - neutral
      success: '#00AA44',      // Green - distinguishable
      warning: '#FF8800',      // Orange - distinguishable
      error: '#CC0000',        // Red - distinguishable
      info: '#0066CC',         // Blue - same as primary
      background: '#FFFFFF',   // White
      surface: '#F8F9FA',     // Light gray
      text: '#000000',        // Black
      textSecondary: '#666666' // Gray
    };
  }

  private applySettings() {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    // Apply font size
    const fontSizeMap = {
      'small': '14px',
      'medium': '16px',
      'large': '18px',
      'extra-large': '20px'
    };
    root.style.setProperty('--accessibility-font-size', fontSizeMap[this.settings.fontSize]);

    // Apply touch target size
    const touchTargetMap = {
      'small': '32px',
      'medium': '44px',
      'large': '56px',
      'extra-large': '68px'
    };
    root.style.setProperty('--accessibility-touch-target', touchTargetMap[this.settings.touchTargetSize]);

    // Apply color scheme
    if (this.settings.colorScheme === 'colorblind-friendly') {
      Object.entries(this.colorBlindFriendlyColors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
      });
    }

    // Apply reduced motion
    if (this.settings.reducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
      root.style.setProperty('--animation-iteration-count', '1');
    }

    // Apply focus indicators
    if (this.settings.focusIndicators) {
      root.classList.add('focus-indicators-enabled');
    } else {
      root.classList.remove('focus-indicators-enabled');
    }

    // Apply screen reader optimizations
    if (this.settings.screenReader) {
      root.classList.add('screen-reader-optimized');
    } else {
      root.classList.remove('screen-reader-optimized');
    }
  }

  updateSettings(newSettings: Partial<AccessibilitySettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.applySettings();
  }

  private saveSettings() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('accessibility-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save accessibility settings:', error);
    }
  }

  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  // Utility methods for components
  getTouchTargetClass(): string {
    return `touch-target-${this.settings.touchTargetSize}`;
  }

  getFontSizeClass(): string {
    return `font-size-${this.settings.fontSize}`;
  }

  getColorSchemeClass(): string {
    return `color-scheme-${this.settings.colorScheme}`;
  }

  isReducedMotion(): boolean {
    return this.settings.reducedMotion;
  }

  isScreenReaderOptimized(): boolean {
    return this.settings.screenReader;
  }

  // Color accessibility helpers
  getContrastRatio(color1: string, color2: string): number {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd use a proper color contrast library
    return 4.5; // Placeholder - should be calculated properly
  }

  isHighContrast(): boolean {
    return this.settings.colorScheme === 'high-contrast' || 
           this.settings.colorScheme === 'dark-high-contrast';
  }

  // Keyboard navigation helpers
  handleKeyboardNavigation(event: KeyboardEvent, onAction: () => void) {
    if (!this.settings.keyboardNavigation) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onAction();
    }
  }

  // Screen reader helpers
  announceToScreenReader(message: string) {
    if (!this.settings.screenReader) return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}

export const accessibilityService = AccessibilityService.getInstance();
export type { AccessibilitySettings, ColorBlindFriendlyColors };
