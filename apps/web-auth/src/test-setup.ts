import { vi } from "vitest";

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

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver ??= MockIntersectionObserver;

if (!("scrollTo" in window)) {
  // biome-ignore lint/suspicious/noExplicitAny: legacy stub
  (window as any).scrollTo = () => undefined;
}
