// DEPRECATED STUB: useResultChecker
// The legacy client-side accuracy polling system has been retired.
// Accuracy data now comes exclusively from the Cloudflare Worker endpoints (/accuracy/today, /accuracy/trend).
// This stub remains only to avoid import errors until all references are removed.

export interface DeprecatedUseResultCheckerReturn {
  isRunning: boolean;
  lastCheckTime: number;
  nextCheckTime: number;
  dailyReport: null;
  validationHistory: any[];
  forceCheck: () => Promise<void>;
  getDailyReport: (date: string) => null;
  getValidationHistory: (days: number) => any[];
}

export const useResultChecker = (): DeprecatedUseResultCheckerReturn => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('[deprecated] useResultChecker: use accuracyService + Worker endpoints instead.');
  }
  return {
    isRunning: false,
    lastCheckTime: 0,
    nextCheckTime: 0,
    dailyReport: null,
    validationHistory: [],
    forceCheck: async () => {},
    getDailyReport: () => null,
    getValidationHistory: () => []
  };
};

