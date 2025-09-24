/**
 * React Hook for Result Checker Service
 * Provides real-time result checking and accuracy tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { resultCheckerService, DailyAccuracyReport, PredictionValidation } from '../services/resultCheckerService';

export interface UseResultCheckerReturn {
  isRunning: boolean;
  lastCheckTime: number;
  nextCheckTime: number;
  dailyReport: DailyAccuracyReport | null;
  validationHistory: PredictionValidation[];
  forceCheck: () => Promise<void>;
  getDailyReport: (date: string) => DailyAccuracyReport | null;
  getValidationHistory: (days: number) => PredictionValidation[];
}

export const useResultChecker = (): UseResultCheckerReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(0);
  const [nextCheckTime, setNextCheckTime] = useState(0);
  const [dailyReport, setDailyReport] = useState<DailyAccuracyReport | null>(null);
  const [validationHistory, setValidationHistory] = useState<PredictionValidation[]>([]);

  // Update status from service
  const updateStatus = useCallback(() => {
    const status = resultCheckerService.getStatus();
    setIsRunning(status.isRunning);
    setLastCheckTime(status.lastCheckTime);
    setNextCheckTime(status.nextCheckTime);
  }, []);

  // Load daily report for today
  const loadDailyReport = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const report = resultCheckerService.getDailyReport(today);
    setDailyReport(report);
  }, []);

  // Load validation history
  const loadValidationHistory = useCallback(() => {
    const history = resultCheckerService.getValidationHistory(7);
    setValidationHistory(history);
  }, []);

  // Force check function
  const forceCheck = useCallback(async () => {
    setIsRunning(true);
    try {
      await resultCheckerService.forceCheck();
      updateStatus();
      loadDailyReport();
      loadValidationHistory();
    } catch (error) {
      console.error('Force check failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, [updateStatus, loadDailyReport, loadValidationHistory]);

  // Get daily report for specific date
  const getDailyReport = useCallback((date: string) => {
    return resultCheckerService.getDailyReport(date);
  }, []);

  // Get validation history for specific days
  const getValidationHistory = useCallback((days: number) => {
    return resultCheckerService.getValidationHistory(days);
  }, []);

  // Setup event listeners
  useEffect(() => {
    // Listen for daily report updates
    const handleDailyReport = (event: CustomEvent) => {
      setDailyReport(event.detail);
      loadValidationHistory();
    };

    // Listen for status updates
    const handleStatusUpdate = () => {
      updateStatus();
    };

    window.addEventListener('fixturecast:daily-report', handleDailyReport as EventListener);
    window.addEventListener('fixturecast:result-check', handleStatusUpdate);

    // Initial load
    updateStatus();
    loadDailyReport();
    loadValidationHistory();

    // Update status every minute
    const statusInterval = setInterval(updateStatus, 60000);

    return () => {
      window.removeEventListener('fixturecast:daily-report', handleDailyReport as EventListener);
      window.removeEventListener('fixturecast:result-check', handleStatusUpdate);
      clearInterval(statusInterval);
    };
  }, [updateStatus, loadDailyReport, loadValidationHistory]);

  return {
    isRunning,
    lastCheckTime,
    nextCheckTime,
    dailyReport,
    validationHistory,
    forceCheck,
    getDailyReport,
    getValidationHistory
  };
};
