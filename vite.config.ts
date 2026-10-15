import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// The only external origin the app talks to: ECB exchange rates for the currency converter.
export const FX_API_ORIGIN = 'https://api.frankfurter.dev';

// GitHub Pages serves static files only and cannot set HTTP response headers,
// so the CSP ships as a <meta http-equiv> tag instead. Kept as a plain exported
// function so it can be unit-tested without running a Vite build.
// Browsers ignore frame-ancestors, sandbox and report-uri in a <meta> CSP.
export function buildContentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    // No 'unsafe-inline': React applies `style` props through the CSSOM, which CSP allows.
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    `connect-src 'self' ${FX_API_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ];
  return directives.join('; ');
}

// Injects the CSP <meta> tag into dist/index.html at build time only, so the
// Vite dev server (and its HMR inline scripts / websocket) is unaffected.
function cspMetaPlugin(): Plugin {
  return {
    name: 'odyssea-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      const metaTag = `<meta http-equiv="Content-Security-Policy" content="${buildContentSecurityPolicy()}">`;
      return html.replace('<head>', `<head>\n    ${metaTag}`);
    },
  };
}

// Everything in the bundle is public. Never inject env vars via `define`.
export default defineConfig({
  base: '/odyssea/',
  plugins: [tailwindcss(), cspMetaPlugin()],
  build: {
    rolldownOptions: {
      output: {
        // Production builds strip every console.* call and debugger statement.
        minify: {
          compress: { dropConsole: true, dropDebugger: true },
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});
