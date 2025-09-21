// Timezone utilities for consistent Europe/London handling across the app

export const LONDON_TIMEZONE = 'Europe/London';

// Returns YYYY-MM-DD for the given date in Europe/London
export const formatDateYYYYMMDDLondon = (date: Date): string => {
  return date.toLocaleDateString('en-CA', {
    timeZone: LONDON_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Convenience helper: today's date YYYY-MM-DD in Europe/London
export const nowLondonDateString = (): string => {
  return formatDateYYYYMMDDLondon(new Date());
};

// Compares whether two Date instances fall on the same calendar day in Europe/London
export const isSameLondonDay = (a: Date, b: Date): boolean => {
  return formatDateYYYYMMDDLondon(a) === formatDateYYYYMMDDLondon(b);
};


