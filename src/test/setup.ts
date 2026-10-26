import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * Runs before every test file (wired via `setupFiles` in vite.config.ts).
 */

// Vitest's `globals: true` gives us `afterEach`, but RTL does not auto-clean
// unless the global afterEach exists at import time. Explicit is safer: a
// leaked DOM between tests produces "found multiple elements" failures that
// look like component bugs.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// jsdom implements neither of these, and both are touched by common UI code.
// Stubbing here rather than per-test keeps failures meaningful.
vi.stubGlobal(
  'matchMedia',
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);

if (!globalThis.crypto.randomUUID) {
  vi.stubGlobal('crypto', {
    ...globalThis.crypto,
    randomUUID: () => '00000000-0000-4000-8000-000000000000',
  });
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}
