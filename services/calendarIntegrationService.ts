interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  url?: string;
  reminder?: {
    minutes: number;
  };
}

interface CalendarIntegrationResult {
  success: boolean;
  message: string;
  eventId?: string;
}

class CalendarIntegrationService {
  private static instance: CalendarIntegrationService;
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = this.checkSupport();
  }

  static getInstance(): CalendarIntegrationService {
    if (!CalendarIntegrationService.instance) {
      CalendarIntegrationService.instance = new CalendarIntegrationService();
    }
    return CalendarIntegrationService.instance;
  }

  private checkSupport(): boolean {
    return typeof navigator !== 'undefined' && 'share' in navigator;
  }

  async addToCalendar(event: CalendarEvent): Promise<CalendarIntegrationResult> {
    try {
      // Try Google Calendar first (most common)
      const googleCalendarUrl = this.generateGoogleCalendarUrl(event);
      
      // Try native Web Share API if available
      if (navigator.share) {
        try {
          await navigator.share({
            title: event.title,
            text: event.description,
            url: googleCalendarUrl
          });
          return {
            success: true,
            message: 'Event shared successfully',
            eventId: this.generateEventId(event)
          };
        } catch (error) {
          // Fall back to direct URL opening
          this.openCalendarUrl(googleCalendarUrl);
          return {
            success: true,
            message: 'Calendar opened',
            eventId: this.generateEventId(event)
          };
        }
      } else {
        // Fall back to opening calendar URL
        this.openCalendarUrl(googleCalendarUrl);
        return {
          success: true,
          message: 'Calendar opened',
          eventId: this.generateEventId(event)
        };
      }
    } catch (error) {
      console.error('Calendar integration error:', error);
      return {
        success: false,
        message: 'Failed to add to calendar'
      };
    }
  }

  private generateGoogleCalendarUrl(event: CalendarEvent): string {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${formatDate(event.startDate)}/${formatDate(event.endDate)}`,
      details: event.description,
      location: event.location || '',
      trp: 'false'
    });

    if (event.url) {
      params.append('sprop', event.url);
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  private generateOutlookUrl(event: CalendarEvent): string {
    const formatDate = (date: Date) => {
      return date.toISOString();
    };

    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: event.title,
      startdt: formatDate(event.startDate),
      enddt: formatDate(event.endDate),
      body: event.description,
      location: event.location || ''
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }

  private generateAppleCalendarUrl(event: CalendarEvent): string {
    // Apple Calendar doesn't have a direct web URL, so we'll use a data URL
    const icsContent = this.generateICSContent(event);
    return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
  }

  private generateICSContent(event: CalendarEvent): string {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FixtureCast//Match Reminder//EN',
      'BEGIN:VEVENT',
      `UID:${this.generateEventId(event)}`,
      `DTSTART:${formatDate(event.startDate)}`,
      `DTEND:${formatDate(event.endDate)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      event.location ? `LOCATION:${event.location}` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(line => line).join('\r\n');
  }

  private generateEventId(event: CalendarEvent): string {
    return `fixturecast-${event.startDate.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private openCalendarUrl(url: string): void {
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      // Fallback if popup is blocked
      window.location.href = url;
    }
  }

  async downloadICS(event: CalendarEvent): Promise<CalendarIntegrationResult> {
    try {
      const icsContent = this.generateICSContent(event);
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        message: 'Calendar file downloaded',
        eventId: this.generateEventId(event)
      };
    } catch (error) {
      console.error('ICS download error:', error);
      return {
        success: false,
        message: 'Failed to download calendar file'
      };
    }
  }

  async setReminder(event: CalendarEvent, reminderMinutes: number = 15): Promise<CalendarIntegrationResult> {
    try {
      // Create a reminder event that starts before the match
      const reminderDate = new Date(event.startDate.getTime() - (reminderMinutes * 60 * 1000));
      
      const reminderEvent: CalendarEvent = {
        ...event,
        title: `⏰ Reminder: ${event.title}`,
        description: `Don't forget! ${event.title} starts in ${reminderMinutes} minutes.`,
        startDate: reminderDate,
        endDate: new Date(reminderDate.getTime() + 5 * 60 * 1000) // 5 minute reminder
      };

      return await this.addToCalendar(reminderEvent);
    } catch (error) {
      console.error('Reminder setting error:', error);
      return {
        success: false,
        message: 'Failed to set reminder'
      };
    }
  }

  getSupportedCalendars(): string[] {
    return ['Google Calendar', 'Outlook', 'Apple Calendar', 'Download ICS'];
  }

  isCalendarSupported(): boolean {
    return this.isSupported;
  }
}

export const calendarIntegrationService = CalendarIntegrationService.getInstance();
export type { CalendarEvent, CalendarIntegrationResult };
