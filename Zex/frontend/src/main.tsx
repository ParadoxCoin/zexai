import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from "@sentry/react"
import App from './App.tsx'
import './i18n'

// Initialize Sentry for frontend tracking
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1, // Monitor 10% of user transactions for performance
    // Session Replay
    replaysSessionSampleRate: 0.1, // Replay 10% of normal user sessions
    replaysOnErrorSampleRate: 1.0, // Replay 100% of sessions with an error
  });
}


// Register Service Worker for Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('SW registration successful with scope: ', registration.scope);
      },
      (err) => {
        console.log('SW registration failed: ', err);
      }
    );
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)