/**
 * Color System Service for Sports Fixture App
 * Manages team and league colors with accessibility considerations
 */

export interface TeamColors {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  border?: string;
}

export interface LeagueColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background?: string;
}

export interface AccessibilityColors {
  highContrast: boolean;
  contrastRatio: number;
  readable: boolean;
  darkMode: boolean;
}

class ColorSystemService {
  private teamColors: Map<string, TeamColors> = new Map();
  private leagueColors: Map<string, LeagueColors> = new Map();
  private isDarkMode = false;

  constructor() {
    this.initializeTeamColors();
    this.initializeLeagueColors();
    this.detectDarkMode();
  }

  /**
   * Initialize team colors with accessibility considerations
   */
  private initializeTeamColors(): void {
    const teamColorData: { [key: string]: TeamColors } = {
      // Premier League
      'Manchester United': { 
        primary: '#DA020E', 
        secondary: '#FFE500', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#B91C1C'
      },
      'Manchester City': { 
        primary: '#6CABDD', 
        secondary: '#1C2C5B', 
        text: '#FFFFFF', 
        background: '#0A0A0A',
        border: '#1E40AF'
      },
      'Liverpool': { 
        primary: '#C8102E', 
        secondary: '#F6EB61', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#B91C1C'
      },
      'Arsenal': { 
        primary: '#EF0107', 
        secondary: '#9C824A', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#DC2626'
      },
      'Chelsea': { 
        primary: '#034694', 
        secondary: '#FFFFFF', 
        text: '#FFFFFF', 
        background: '#0A0A0A',
        border: '#1E40AF'
      },
      'Tottenham': { 
        primary: '#132257', 
        secondary: '#FFFFFF', 
        text: '#FFFFFF', 
        background: '#0A0A0A',
        border: '#1E40AF'
      },
      'Newcastle': { 
        primary: '#241F20', 
        secondary: '#FFFFFF', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#374151'
      },
      'West Ham': { 
        primary: '#7A263A', 
        secondary: '#1BB1E7', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#991B1B'
      },

      // La Liga
      'Barcelona': { 
        primary: '#A50044', 
        secondary: '#004D98', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#BE185D'
      },
      'Real Madrid': { 
        primary: '#FFFFFF', 
        secondary: '#FEBE10', 
        text: '#000000', 
        background: '#0A0A0A',
        border: '#E5E7EB'
      },
      'Atletico Madrid': { 
        primary: '#CE1126', 
        secondary: '#FFFFFF', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#B91C1C'
      },
      'Sevilla': { 
        primary: '#FFFFFF', 
        secondary: '#000000', 
        text: '#000000', 
        background: '#0A0A0A',
        border: '#E5E7EB'
      },
      'Valencia': { 
        primary: '#FF6600', 
        secondary: '#000000', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#EA580C'
      },

      // Serie A
      'Juventus': { 
        primary: '#000000', 
        secondary: '#FFFFFF', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#374151'
      },
      'AC Milan': { 
        primary: '#FB090B', 
        secondary: '#000000', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#DC2626'
      },
      'Inter Milan': { 
        primary: '#0068A8', 
        secondary: '#000000', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#1E40AF'
      },
      'Napoli': { 
        primary: '#0C4CA3', 
        secondary: '#FFFFFF', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#1E40AF'
      },
      'Roma': { 
        primary: '#8B0000', 
        secondary: '#FFD700', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#991B1B'
      },

      // Bundesliga
      'Bayern Munich': { 
        primary: '#DC052D', 
        secondary: '#FFFFFF', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#B91C1C'
      },
      'Borussia Dortmund': { 
        primary: '#FDE100', 
        secondary: '#000000', 
        text: '#000000', 
        background: '#1A1A1A',
        border: '#EAB308'
      },
      'RB Leipzig': { 
        primary: '#DD0031', 
        secondary: '#FFFFFF', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#B91C1C'
      },
      'Bayer Leverkusen': { 
        primary: '#E32221', 
        secondary: '#000000', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#DC2626'
      },

      // Ligue 1
      'PSG': { 
        primary: '#004170', 
        secondary: '#ED1C24', 
        text: '#FFFFFF', 
        background: '#0A0A0A',
        border: '#1E40AF'
      },
      'Marseille': { 
        primary: '#0066CC', 
        secondary: '#FFFFFF', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#1E40AF'
      },
      'Lyon': { 
        primary: '#FFFFFF', 
        secondary: '#000000', 
        text: '#000000', 
        background: '#0A0A0A',
        border: '#E5E7EB'
      },

      // Champions League
      'Ajax': { 
        primary: '#D2122E', 
        secondary: '#FFFFFF', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#B91C1C'
      },
      'Porto': { 
        primary: '#0066CC', 
        secondary: '#FFFFFF', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#1E40AF'
      },
      'Benfica': { 
        primary: '#FF0000', 
        secondary: '#FFFFFF', 
        text: '#FFFFFF', 
        background: '#1A1A1A',
        border: '#DC2626'
      }
    };

    Object.entries(teamColorData).forEach(([team, colors]) => {
      this.teamColors.set(team, colors);
    });
  }

  /**
   * Initialize league colors with accessibility considerations
   */
  private initializeLeagueColors(): void {
    const leagueColorData: { [key: string]: LeagueColors } = {
      'Premier League': { 
        primary: '#37003C', 
        secondary: '#00FF85', 
        accent: '#FFFFFF', 
        text: '#FFFFFF',
        background: '#1A1A1A'
      },
      'La Liga': { 
        primary: '#FF6900', 
        secondary: '#FFB800', 
        accent: '#FFFFFF', 
        text: '#000000',
        background: '#FEF3C7'
      },
      'Serie A': { 
        primary: '#0068A8', 
        secondary: '#FFFFFF', 
        accent: '#000000', 
        text: '#FFFFFF',
        background: '#1A1A1A'
      },
      'Bundesliga': { 
        primary: '#D20515', 
        secondary: '#FFFFFF', 
        accent: '#000000', 
        text: '#FFFFFF',
        background: '#1A1A1A'
      },
      'Ligue 1': { 
        primary: '#1E3A8A', 
        secondary: '#F59E0B', 
        accent: '#FFFFFF', 
        text: '#FFFFFF',
        background: '#1A1A1A'
      },
      'Champions League': { 
        primary: '#0033A0', 
        secondary: '#FFD700', 
        accent: '#FFFFFF', 
        text: '#FFFFFF',
        background: '#1A1A1A'
      },
      'Europa League': { 
        primary: '#FF6900', 
        secondary: '#FFFFFF', 
        accent: '#000000', 
        text: '#FFFFFF',
        background: '#1A1A1A'
      },
      'Conference League': { 
        primary: '#8B5CF6', 
        secondary: '#FFFFFF', 
        accent: '#000000', 
        text: '#FFFFFF',
        background: '#1A1A1A'
      }
    };

    Object.entries(leagueColorData).forEach(([league, colors]) => {
      this.leagueColors.set(league, colors);
    });
  }

  /**
   * Detect dark mode preference
   */
  private detectDarkMode(): void {
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const hasDarkClass = document.documentElement.classList.contains('dark');
      this.isDarkMode = prefersDark || hasDarkClass;
    }
  }

  /**
   * Get team colors with accessibility fallback
   */
  public getTeamColors(teamName: string): TeamColors {
    const colors = this.teamColors.get(teamName);
    if (colors) {
      return this.ensureAccessibility(colors);
    }

    // Generate fallback colors based on team name hash
    const hash = this.hashString(teamName);
    const primary = this.generateColorFromHash(hash);
    const secondary = this.generateColorFromHash(hash + 1);
    
    return this.ensureAccessibility({
      primary,
      secondary,
      text: this.isDarkMode ? '#FFFFFF' : '#000000',
      background: this.isDarkMode ? '#1F2937' : '#F3F4F6',
      border: primary
    });
  }

  /**
   * Get league colors with accessibility fallback
   */
  public getLeagueColors(leagueName: string): LeagueColors {
    const colors = this.leagueColors.get(leagueName);
    if (colors) {
      return this.ensureAccessibility(colors);
    }

    // Generate fallback colors based on league name hash
    const hash = this.hashString(leagueName);
    const primary = this.generateColorFromHash(hash);
    const secondary = this.generateColorFromHash(hash + 1);
    
    return this.ensureAccessibility({
      primary,
      secondary,
      accent: this.isDarkMode ? '#FFFFFF' : '#000000',
      text: this.isDarkMode ? '#FFFFFF' : '#000000',
      background: this.isDarkMode ? '#1F2937' : '#F3F4F6'
    });
  }

  /**
   * Ensure colors meet accessibility standards
   */
  private ensureAccessibility(colors: TeamColors | LeagueColors): TeamColors | LeagueColors {
    const contrastRatio = this.calculateContrastRatio(colors.primary, colors.text);
    
    if (contrastRatio < 4.5) {
      // Adjust colors for better contrast
      if (this.isDarkMode) {
        return {
          ...colors,
          text: '#FFFFFF',
          primary: this.adjustColorForContrast(colors.primary, '#FFFFFF')
        };
      } else {
        return {
          ...colors,
          text: '#000000',
          primary: this.adjustColorForContrast(colors.primary, '#000000')
        };
      }
    }

    return colors;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  private calculateContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Get luminance of a color
   */
  private getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;
    
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Adjust color for better contrast
   */
  private adjustColorForContrast(color: string, targetColor: string): string {
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;

    const targetRgb = this.hexToRgb(targetColor);
    if (!targetRgb) return color;

    // Adjust brightness to improve contrast
    const factor = this.isDarkMode ? 0.8 : 1.2;
    const adjusted = {
      r: Math.min(255, Math.max(0, rgb.r * factor)),
      g: Math.min(255, Math.max(0, rgb.g * factor)),
      b: Math.min(255, Math.max(0, rgb.b * factor))
    };

    return `#${Math.round(adjusted.r).toString(16).padStart(2, '0')}${Math.round(adjusted.g).toString(16).padStart(2, '0')}${Math.round(adjusted.b).toString(16).padStart(2, '0')}`;
  }

  /**
   * Generate color from hash
   */
  private generateColorFromHash(hash: number): string {
    const hue = (hash * 137.508) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  /**
   * Hash string to number
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get accessibility information for colors
   */
  public getAccessibilityInfo(colors: TeamColors | LeagueColors): AccessibilityColors {
    const contrastRatio = this.calculateContrastRatio(colors.primary, colors.text);
    
    return {
      highContrast: contrastRatio >= 7,
      contrastRatio,
      readable: contrastRatio >= 4.5,
      darkMode: this.isDarkMode
    };
  }

  /**
   * Update dark mode preference
   */
  public updateDarkMode(isDark: boolean): void {
    this.isDarkMode = isDark;
  }

  /**
   * Get all team colors
   */
  public getAllTeamColors(): Map<string, TeamColors> {
    return new Map(this.teamColors);
  }

  /**
   * Get all league colors
   */
  public getAllLeagueColors(): Map<string, LeagueColors> {
    return new Map(this.leagueColors);
  }
}

// Create singleton instance
export const colorSystemService = new ColorSystemService();
