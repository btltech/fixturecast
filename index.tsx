import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider } from './contexts/AppContext';
import App from './App';

// Add global error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('🔴 Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 Unhandled promise rejection:', event.reason);
});

// Log app initialization
console.log('🚀 FixtureCast starting...', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  url: window.location.href
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
