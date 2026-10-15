import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import './src/i18n';

// `test.globals` is off, so React Testing Library's auto-cleanup never registers. Do it here.
afterEach(() => {
  cleanup();
});
