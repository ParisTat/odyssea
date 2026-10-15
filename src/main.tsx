import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
// Self-hosted fonts (served from our own origin, so the CSP needs no font CDN).
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './i18n';
import './index.css';
import { resolveInitialTheme } from './domain/theme';
import { applyTheme, prefersDarkScheme, readStoredTheme } from './hooks/useTheme';
import App from './App';

// Apply the saved (or system) theme before the first render, so the page never paints in the wrong colours.
applyTheme(resolveInitialTheme(readStoredTheme(), prefersDarkScheme()));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
