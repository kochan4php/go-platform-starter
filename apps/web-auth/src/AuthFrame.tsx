import { BrandMark, FooterStrip } from "@starter/ui";
import type { ReactNode } from "react";

const WORDS = ["Sessions", "Rotation", "Lockout", "Claims", "Rooms", "Presence", "Audit", "Streams"];

/**
 * Shared asymmetric stage for every auth screen: copy offset left with an
 * overlapping art plate bottom-right, capability marquee pinned to the base.
 */
export default function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="ui-stage min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="relative mx-auto grid min-h-screen max-w-[1400px] grid-cols-12">
        <div className="col-span-12 flex flex-col justify-between px-5 py-8 sm:px-8 md:px-14 lg:col-span-7 lg:py-16">
          <header>
            <BrandMark />
          </header>

          <div className="max-w-5xl py-16">{children}</div>

          <footer className="mt-auto overflow-hidden border-t border-[var(--color-line)] pt-5">
            <div className="mb-4">
              <FooterStrip />
            </div>
            <div className="flex w-max animate-ui-marquee gap-10 whitespace-nowrap will-change-transform">
              {[0, 1].map((copy) => (
                <div key={copy} aria-hidden={copy === 1} className="flex gap-10">
                  {WORDS.map((w) => (
                    <span
                      key={`${copy}-${w}`}
                      className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]"
                    >
                      {w}
                      <span className="ml-10 text-[var(--color-accent)]">/</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </footer>
        </div>

        <aside aria-hidden className="relative hidden lg:col-span-5 lg:block">
          <div className="absolute inset-y-0 right-4 my-auto h-[78%] w-[86%] overflow-hidden rounded-[28px] border border-[var(--color-line)] shadow-2xl shadow-black/40">
            <img
              src="https://picsum.photos/seed/noir-terminal/1200/1600"
              alt=""
              className="h-full w-full object-cover opacity-80 grayscale contrast-125 transition-transform duration-700 ease-out hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            <p className="absolute bottom-6 left-6 max-w-[16rem] font-mono text-xs leading-relaxed text-white/70">
              single gateway · schema-per-service · at-least-once streams with idempotent handlers
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
