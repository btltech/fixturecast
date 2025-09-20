import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider } from './contexts/AppContext';
import App from './App';

// Add global error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('🔴 Global error caught:', {
    error: event.error,
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
  
  // Show user-friendly error instead of white screen
  const root = document.getElementById('root');
  if (root && !root.innerHTML.includes('Something went wrong')) {
    root.innerHTML = `
      <div style="min-height: 100vh; background: #1f2937; color: white; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;">
        <div style="text-align: center; padding: 20px;">
          <h1 style="font-size: 24px; margin-bottom: 16px;">Something went wrong</h1>
          <p style="color: #9ca3af; margin-bottom: 16px;">A JavaScript error occurred while loading the app</p>
          <button onclick="window.location.reload()" style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
            Refresh Page
          </button>
          <div style="margin-top: 20px;">
            <a href="/debug.html" style="color: #60a5fa; text-decoration: none;">Debug Page</a> | 
            <a href="/health-check.html" style="color: #60a5fa; text-decoration: none;">Health Check</a>
          </div>
        </div>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise
  });
});

// Log app initialization
console.log('🚀 FixtureCast starting...', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  url: window.location.href,
  deployment: window.location.hostname.includes('.pages.dev') ? 'cloudflare' : 
             window.location.hostname.includes('.vercel.app') ? 'vercel' : 'other'
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AppProvider>
          <App />
        </AppProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
