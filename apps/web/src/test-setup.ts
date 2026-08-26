import { vi } from "vitest";

// React 19 + @testing-library/react 16 + jsdom: the production bundle of
// react-dom does not export `act`. Stub matchMedia + ensure RTL pulls the
// dev build (configured via resolve.conditions in vitest.config.ts).

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: () => false,
  }));
}

// IntersectionObserver stub — used by some package code under jsdom.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver ??= MockIntersectionObserver;

// matchMedia scrollTo stub.
if (!("scrollTo" in window)) {
  // biome-ignore lint/suspicious/noExplicitAny: legacy stub
  (window as any).scrollTo = () => undefined;
}
