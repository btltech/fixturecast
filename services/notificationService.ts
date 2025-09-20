import { Match } from '../types';

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export interface NotificationSettings {
  matchStart: boolean;
  lineupPosted: boolean;
  goals: boolean;
  fullTime: boolean;
  teamFollowed: boolean;
  leagueFollowed: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export interface NotificationTopic {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

class NotificationService {
  private settings: NotificationSettings = {
    matchStart: true,
    lineupPosted: true,
    goals: true,
    fullTime: true,
    teamFollowed: true,
    leagueFollowed: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  };

  private topics: NotificationTopic[] = [
    { id: 'match-start', name: 'Match Start', description: 'Get notified when matches begin', enabled: true },
    { id: 'lineup-posted', name: 'Lineup Posted', description: 'Get notified when team lineups are announced', enabled: true },
    { id: 'goals', name: 'Goals', description: 'Get notified when goals are scored', enabled: true },
    { id: 'full-time', name: 'Full Time', description: 'Get notified when matches end', enabled: true },
    { id: 'team-followed', name: 'Followed Teams', description: 'Get notified about your followed teams', enabled: true },
    { id: 'league-followed', name: 'Followed Leagues', description: 'Get notified about your followed leagues', enabled: false }
  ];

  private followedTeams: string[] = [];
  private followedLeagues: string[] = [];

  constructor() {
    this.loadSettings();
    this.loadFollowedItems();
    this.initializeServiceWorker();
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return { granted: false, denied: true, default: false };
    }

    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    if (this.getPermissionStatus().granted) {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Request permission contextually (e.g., after following a team)
  async requestPermissionContextually(context: string): Promise<boolean> {
    if (this.getPermissionStatus().denied) {
      return false;
    }

    if (this.getPermissionStatus().granted) {
      return true;
    }

    // Show contextual permission request
    const shouldRequest = await this.showContextualPermissionDialog(context);
    if (shouldRequest) {
      return await this.requestPermission();
    }

    return false;
  }

  // Show contextual permission dialog
  private async showContextualPermissionDialog(context: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Create a custom dialog for contextual permission request
      const dialog = document.createElement('div');
      dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      dialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              🔔
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Stay Updated!</h3>
              <p class="text-sm text-gray-600">Get notified about ${context}</p>
            </div>
          </div>
          <p class="text-gray-700 mb-4">
            We'll send you notifications about match updates, goals, and important events. 
            You can customize these settings anytime.
          </p>
          <div class="flex space-x-3">
            <button id="notify-later" class="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
              Maybe Later
            </button>
            <button id="notify-enable" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Enable Notifications
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      // Handle button clicks
      dialog.querySelector('#notify-later')?.addEventListener('click', () => {
        document.body.removeChild(dialog);
        resolve(false);
      });

      dialog.querySelector('#notify-enable')?.addEventListener('click', () => {
        document.body.removeChild(dialog);
        resolve(true);
      });
    });
  }

  // Send notification
  async sendNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!this.getPermissionStatus().granted) {
      console.warn('Notifications not granted');
      return;
    }

    if (this.isQuietHours()) {
      console.log('Quiet hours active, skipping notification');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        silent: false,
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Send match start notification
  async notifyMatchStart(match: Match): Promise<void> {
    if (!this.settings.matchStart) return;

    const title = `⚽ ${match.homeTeam} vs ${match.awayTeam}`;
    const body = `Match starting now in ${match.league}`;
    
    await this.sendNotification(title, {
      body,
      tag: `match-start-${match.id}`,
      data: { type: 'match-start', matchId: match.id }
    });
  }

  // Send lineup posted notification
  async notifyLineupPosted(match: Match): Promise<void> {
    if (!this.settings.lineupPosted) return;

    const title = `📋 Lineups announced`;
    const body = `${match.homeTeam} vs ${match.awayTeam} - Check the starting XI`;
    
    await this.sendNotification(title, {
      body,
      tag: `lineup-${match.id}`,
      data: { type: 'lineup', matchId: match.id }
    });
  }

  // Send goal notification
  async notifyGoal(match: Match, scorer: string, team: string, minute: number): Promise<void> {
    if (!this.settings.goals) return;

    const title = `⚽ GOAL! ${team}`;
    const body = `${scorer} scores in the ${minute}' minute`;
    
    await this.sendNotification(title, {
      body,
      tag: `goal-${match.id}-${Date.now()}`,
      data: { type: 'goal', matchId: match.id, scorer, team, minute }
    });
  }

  // Send full-time notification
  async notifyFullTime(match: Match, homeScore: number, awayScore: number): Promise<void> {
    if (!this.settings.fullTime) return;

    const title = `🏁 Full Time: ${homeScore}-${awayScore}`;
    const body = `${match.homeTeam} vs ${match.awayTeam}`;
    
    await this.sendNotification(title, {
      body,
      tag: `fulltime-${match.id}`,
      data: { type: 'fulltime', matchId: match.id, homeScore, awayScore }
    });
  }

  // Follow a team
  async followTeam(teamName: string): Promise<void> {
    if (!this.followedTeams.includes(teamName)) {
      this.followedTeams.push(teamName);
      this.saveFollowedItems();

      // Request permission contextually
      await this.requestPermissionContextually(`your followed team ${teamName}`);
    }
  }

  // Follow a league
  async followLeague(leagueName: string): Promise<void> {
    if (!this.followedLeagues.includes(leagueName)) {
      this.followedLeagues.push(leagueName);
      this.saveFollowedItems();

      // Request permission contextually
      await this.requestPermissionContextually(`your followed league ${leagueName}`);
    }
  }

  // Unfollow a team
  unfollowTeam(teamName: string): void {
    this.followedTeams = this.followedTeams.filter(team => team !== teamName);
    this.saveFollowedItems();
  }

  // Unfollow a league
  unfollowLeague(leagueName: string): void {
    this.followedLeagues = this.followedLeagues.filter(league => league !== leagueName);
    this.saveFollowedItems();
  }

  // Get notification settings
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  // Update notification settings
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  // Get notification topics
  getTopics(): NotificationTopic[] {
    return [...this.topics];
  }

  // Update topic settings
  updateTopic(topicId: string, enabled: boolean): void {
    const topic = this.topics.find(t => t.id === topicId);
    if (topic) {
      topic.enabled = enabled;
      this.saveSettings();
    }
  }

  // Check if it's quiet hours
  private isQuietHours(): boolean {
    if (!this.settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = this.parseTime(this.settings.quietHours.start);
    const endTime = this.parseTime(this.settings.quietHours.end);

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Parse time string (HH:MM) to minutes
  private parseTime(timeString: string): number {
    if (!timeString || typeof timeString !== 'string') {
      console.warn('Invalid time string provided to parseTime:', timeString);
      return 0;
    }

    const parts = timeString.split(':');
    if (parts.length !== 2) {
      console.warn('Invalid time format, expected HH:MM:', timeString);
      return 0;
    }

    const [hours, minutes] = parts.map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.warn('Invalid time values in parseTime:', timeString);
      return 0;
    }

    return hours * 60 + minutes;
  }

  // Initialize service worker
  private async initializeServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      // Check if service worker file exists before registering
      const swPath = '/sw.js';
      const response = await fetch(swPath, { method: 'HEAD' });
      if (response.ok) {
        const registration = await navigator.serviceWorker.register(swPath);
        console.log('Service Worker registered:', registration);
      } else {
        console.warn('Service Worker file not found at:', swPath);
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  // Load settings from localStorage
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('fixturecast_notification_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error);
    }
  }

  // Save settings to localStorage
  private saveSettings(): void {
    try {
      localStorage.setItem('fixturecast_notification_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  // Load followed items from localStorage
  private loadFollowedItems(): void {
    try {
      const saved = localStorage.getItem('fixturecast_followed_items');
      if (saved) {
        const data = JSON.parse(saved);
        this.followedTeams = data.teams || [];
        this.followedLeagues = data.leagues || [];
      }
    } catch (error) {
      console.warn('Failed to load followed items:', error);
    }
  }

  // Save followed items to localStorage
  private saveFollowedItems(): void {
    try {
      localStorage.setItem('fixturecast_followed_items', JSON.stringify({
        teams: this.followedTeams,
        leagues: this.followedLeagues
      }));
    } catch (error) {
      console.error('Failed to save followed items:', error);
    }
  }

  // Get followed teams
  getFollowedTeams(): string[] {
    return [...this.followedTeams];
  }

  // Get followed leagues
  getFollowedLeagues(): string[] {
    return [...this.followedLeagues];
  }

  // Check if team is followed
  isTeamFollowed(teamName: string): boolean {
    return this.followedTeams.includes(teamName);
  }

  // Check if league is followed
  isLeagueFollowed(leagueName: string): boolean {
    return this.followedLeagues.includes(leagueName);
  }
}

export const notificationService = new NotificationService();
