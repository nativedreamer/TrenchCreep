import React from 'react';
import ReactDOM from 'react-dom/client';
import DashboardPage from './page';
import './globals.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <DashboardPage />
    </React.StrictMode>
  );
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[PWA] Service worker registration failed:', error);
    });
  });
}
