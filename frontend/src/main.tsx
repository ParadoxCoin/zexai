import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './i18n'

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