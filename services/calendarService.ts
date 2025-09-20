import { Match } from '../types';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  location: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  venue: string;
  timezone: string;
  reminders: CalendarReminder[];
  attendees?: string[];
  url?: string;
}

export interface CalendarReminder {
  minutes: number;
  method: 'popup' | 'email' | 'sound';
}

export interface NotificationSettings {
  enabled: boolean;
  matchReminders: boolean;
  scoreUpdates: boolean;
  newsAlerts: boolean;
  reminderMinutes: number[];
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  timezone: string;
}

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class CalendarService {
  private notificationSettings: NotificationSettings;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.notificationSettings = this.loadNotificationSettings();
    
    if (typeof window !== 'undefined') {
      try {
        this.initializeServiceWorker();
      } catch (error) {
        console.warn('Failed to initialize service worker:', error);
      }
    }
  }

  // Load notification settings from localStorage
  private loadNotificationSettings(): NotificationSettings {
    const defaultSettings: NotificationSettings = {
      enabled: true,
      matchReminders: true,
      scoreUpdates: true,
      newsAlerts: false,
      reminderMinutes: [60, 30, 15], // 1 hour, 30 min, 15 min before
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
    };

    if (typeof window === 'undefined') {
      return defaultSettings;
    }

    try {
      const saved = localStorage.getItem('fixturecast_notification_settings');
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error);
    }

    return defaultSettings;
  }

  // Save notification settings to localStorage
  private saveNotificationSettings() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('fixturecast_notification_settings', JSON.stringify(this.notificationSettings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  // Initialize service worker for notifications
  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Create calendar event from match
  createCalendarEvent(match: Match): CalendarEvent {
    const matchDate = new Date(match.date);
    const eventDate = new Date(matchDate);
    eventDate.setHours(matchDate.getHours() + 2); // Assume 2-hour duration

    return {
      id: `match-${match.id}`,
      title: `${match.homeTeam} vs ${match.awayTeam}`,
      description: `${match.league} match at ${match.venue || 'TBD'}`,
      start: matchDate,
      end: eventDate,
      location: match.venue || 'TBD',
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      venue: match.venue || 'TBD',
      timezone: this.notificationSettings.timezone,
      reminders: this.getDefaultReminders(),
      url: window.location.origin + `#match-${match.id}`
    };
  }

  // Get default reminders based on settings
  private getDefaultReminders(): CalendarReminder[] {
    return this.notificationSettings.reminderMinutes.map(minutes => ({
      minutes,
      method: 'popup' as const
    }));
  }

  // Add match to calendar (Google Calendar, Outlook, etc.)
  async addToCalendar(match: Match, provider: 'google' | 'outlook' | 'apple' = 'google'): Promise<boolean> {
    try {
      const event = this.createCalendarEvent(match);
      
      switch (provider) {
        case 'google':
          return await this.addToGoogleCalendar(event);
        case 'outlook':
          return await this.addToOutlookCalendar(event);
        case 'apple':
          return await this.addToAppleCalendar(event);
        default:
          throw new Error('Unsupported calendar provider');
      }
    } catch (error) {
      console.error('Failed to add to calendar:', error);
      return false;
    }
  }

  // Add to Google Calendar
  private async addToGoogleCalendar(event: CalendarEvent): Promise<boolean> {
    const startTime = event.start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = event.end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}`;
    
    window.open(googleUrl, '_blank');
    return true;
  }

  // Add to Outlook Calendar
  private async addToOutlookCalendar(event: CalendarEvent): Promise<boolean> {
    const startTime = event.start.toISOString();
    const endTime = event.end.toISOString();
    
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&startdt=${startTime}&enddt=${endTime}&body=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}`;
    
    window.open(outlookUrl, '_blank');
    return true;
  }

  // Add to Apple Calendar
  private async addToAppleCalendar(event: CalendarEvent): Promise<boolean> {
    const startTime = event.start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = event.end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const appleUrl = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${startTime}%0ADTEND:${endTime}%0ASUMMARY:${encodeURIComponent(event.title)}%0ADESCRIPTION:${encodeURIComponent(event.description)}%0ALOCATION:${encodeURIComponent(event.location)}%0AEND:VEVENT%0AEND:VCALENDAR`;
    
    const link = document.createElement('a');
    link.href = appleUrl;
    link.download = `${event.homeTeam}-vs-${event.awayTeam}.ics`;
    link.click();
    
    return true;
  }

  // Send push notification
  async sendNotification(notification: PushNotification): Promise<boolean> {
    if (!this.notificationSettings.enabled) {
      return false;
    }

    // Check quiet hours
    if (this.isInQuietHours()) {
      console.log('Notification suppressed due to quiet hours');
      return false;
    }

    try {
      if (this.serviceWorkerRegistration) {
        await this.serviceWorkerRegistration.showNotification(notification.title, {
          body: notification.body,
          icon: notification.icon || '/icon-192x192.png',
          badge: notification.badge || '/icon-192x192.png',
          data: notification.data,
          requireInteraction: true,
          tag: 'fixturecast-notification'
        });
        return true;
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.body,
          icon: notification.icon || '/icon-192x192.png',
          badge: notification.badge || '/icon-192x192.png'
        });
        return true;
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    return false;
  }

  // Check if current time is in quiet hours
  private isInQuietHours(): boolean {
    if (!this.notificationSettings.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const { start, end } = this.notificationSettings.quietHours;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }

    // Handle same-day quiet hours (e.g., 12:00 to 14:00)
    return currentTime >= start && currentTime <= end;
  }

  // Schedule match reminder
  async scheduleMatchReminder(match: Match): Promise<boolean> {
    if (!this.notificationSettings.matchReminders) {
      return false;
    }

    const matchDate = new Date(match.date);
    const now = new Date();
    const timeUntilMatch = matchDate.getTime() - now.getTime();

    // Don't schedule reminders for past matches
    if (timeUntilMatch <= 0) {
      return false;
    }

    // Schedule reminders based on settings
    for (const minutes of this.notificationSettings.reminderMinutes) {
      const reminderTime = timeUntilMatch - (minutes * 60 * 1000);
      
      if (reminderTime > 0) {
        setTimeout(() => {
          this.sendNotification({
            title: `Match Reminder: ${match.homeTeam} vs ${match.awayTeam}`,
            body: `The ${match.league} match starts in ${minutes} minutes!`,
            data: { matchId: match.id, type: 'reminder' },
            actions: [
              {
                action: 'view',
                title: 'View Match',
                icon: '/icon-192x192.png'
              }
            ]
          });
        }, reminderTime);
      }
    }

    return true;
  }

  // Send score update notification
  async sendScoreUpdate(match: Match, homeScore: number, awayScore: number): Promise<boolean> {
    if (!this.notificationSettings.scoreUpdates) {
      return false;
    }

    return await this.sendNotification({
      title: `Score Update: ${match.homeTeam} ${homeScore}-${awayScore} ${match.awayTeam}`,
      body: `${match.league} match in progress`,
      data: { matchId: match.id, type: 'score', homeScore, awayScore },
      actions: [
        {
          action: 'view',
          title: 'View Match',
          icon: '/icon-192x192.png'
        }
      ]
    });
  }

  // Send news alert notification
  async sendNewsAlert(title: string, summary: string): Promise<boolean> {
    if (!this.notificationSettings.newsAlerts) {
      return false;
    }

    return await this.sendNotification({
      title: `News: ${title}`,
      body: summary,
      data: { type: 'news' },
      actions: [
        {
          action: 'view',
          title: 'Read More',
          icon: '/icon-192x192.png'
        }
      ]
    });
  }

  // Update notification settings
  updateNotificationSettings(settings: Partial<NotificationSettings>) {
    this.notificationSettings = { ...this.notificationSettings, ...settings };
    this.saveNotificationSettings();
  }

  // Get current notification settings
  getNotificationSettings(): NotificationSettings {
    return { ...this.notificationSettings };
  }

  // Check if notifications are supported and enabled
  isNotificationSupported(): boolean {
    return 'Notification' in window && this.notificationSettings.enabled;
  }

  // Get notification permission status
  getNotificationPermission(): NotificationPermission {
    return 'Notification' in window ? Notification.permission : 'denied';
  }

  // Cleanup
  destroy() {
    // Cancel any pending notifications
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.getNotifications().then(notifications => {
        notifications.forEach(notification => notification.close());
      });
    }
  }
}

// Export singleton instance
export const calendarService = new CalendarService();
