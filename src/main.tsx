import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Suppress benign Vite WebSocket errors in AI Studio
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (
    event.reason.message?.includes('WebSocket') || 
    event.reason.message?.includes('vite') ||
    event.reason.message?.includes('HMR') ||
    String(event.reason).includes('WebSocket') ||
    String(event.reason).includes('closed without opened')
  )) {
    event.preventDefault();
    console.debug('Suppressed benign WebSocket rejection:', event.reason);
  }
});

window.addEventListener('error', (event) => {
  if (event.message && (
    event.message.includes('WebSocket') || 
    event.message.includes('vite') ||
    event.message.includes('HMR') ||
    event.message.includes('closed without opened')
  )) {
    event.preventDefault();
    console.debug('Suppressed benign WebSocket error:', event.message);
  }
});

// Unregister any existing Service Workers to prevent caching issues in AI Studio
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('Unregistered old Service Worker to fix caching');
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
