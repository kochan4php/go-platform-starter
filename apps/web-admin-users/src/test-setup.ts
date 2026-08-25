// jsdom does not implement matchMedia; gsap/ScrollTrigger requires it at
// plugin registration time. Minimal stub: everything reports non-matching so
// reduced-motion guards behave like an ordinary desktop browser.
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
