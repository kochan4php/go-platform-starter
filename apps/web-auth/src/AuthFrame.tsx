import { GATEWAY_URL } from "@starter/contracts";
import { BrandMark, FooterStrip } from "@starter/ui";
import { type PointerEvent, type ReactNode, useEffect, useState } from "react";

const FEATURES = [
  ["Sessions", "Rotating, httpOnly refresh sessions"],
  ["Lockout", "Uniform login protection without account disclosure"],
  ["Claims", "Short-lived authorization claims"],
  ["Audit", "Traceable security events"],
] as const;

const PAGE = {
  login: { title: "Log in", seed: "quiet-console", glyph: "L" },
  register: { title: "Register", seed: "new-seat", glyph: "R" },
  forgot: { title: "Recover access", seed: "recovery-signal", glyph: "F" },
  reset: { title: "Reset password", seed: "fresh-key", glyph: "N" },
} as const;

export type AuthPage = keyof typeof PAGE;

declare global {
  interface Window {
    __STARTER_VERSION__?: string;
    __STARTER_COMMIT__?: string;
  }
}

const version = typeof window === "undefined" ? "dev" : (window.__STARTER_VERSION__ ?? "0.6.0");
const commit = typeof window === "undefined" ? "local" : (window.__STARTER_COMMIT__ ?? "local");

export default function AuthFrame({ page, children }: { page: AuthPage; children: ReactNode }) {
  const [brandTip, setBrandTip] = useState(false);
  const [featureTip, setFeatureTip] = useState("");
  const [artLoaded, setArtLoaded] = useState(false);
  const [health, setHealth] = useState<"checking" | "operational" | "unavailable">("checking");
  const meta = PAGE[page];

  useEffect(() => {
    document.title = `${meta.title} · Platform Console`;
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.append(favicon);
    }
    favicon.href = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#09090b"/><circle cx="32" cy="32" r="17" fill="#d8f34f"/><text x="32" y="39" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="800" fill="#09090b">${meta.glyph}</text></svg>`)}`;
  }, [meta]);

  useEffect(() => {
    let active = true;
    fetch(`${GATEWAY_URL}/healthz`, { credentials: "omit" })
      .then((response) => active && setHealth(response.ok ? "operational" : "unavailable"))
      .catch(() => active && setHealth("unavailable"));
    return () => {
      active = false;
    };
  }, []);

  const parallax = (event: PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 12;
    event.currentTarget.style.setProperty("--auth-art-x", `${x}px`);
    event.currentTarget.style.setProperty("--auth-art-y", `${y}px`);
  };

  const art = (
    <div className="ui-auth-art-card">
      {!artLoaded ? <div className="ui-skeleton absolute inset-0 bg-[var(--color-skeleton)]" /> : null}
      <img
        src={`https://picsum.photos/seed/${meta.seed}/1200/1600`}
        alt=""
        onLoad={() => setArtLoaded(true)}
        className={`ui-auth-art-image ${artLoaded ? "opacity-80" : "opacity-0"}`}
      />
      <div className="ui-auth-art-overlay" />
      <p className="absolute bottom-5 left-5 right-5 font-mono text-[11px] leading-relaxed text-white/75 sm:bottom-6 sm:left-6 sm:max-w-[18rem]">
        single gateway · schema-per-service · resilient sessions
      </p>
    </div>
  );

  return (
    <main
      id="main-content"
      className="ui-stage ui-auth-stage min-h-screen w-full max-w-full overflow-x-hidden"
    >
      <div className="relative mx-auto grid min-h-screen max-w-[1400px] grid-cols-12">
        <div className="col-span-12 flex min-w-0 flex-col px-5 py-6 sm:px-8 sm:py-8 md:px-12 lg:col-span-7 lg:px-14 lg:py-14">
          <header className="relative z-10 flex items-center justify-between">
            <BrandMark
              href="/"
              tooltip={`Platform Console v${version}`}
              onClick={(event) => {
                event.preventDefault();
                setBrandTip((current) => !current);
              }}
            />
            {brandTip ? (
              <p role="tooltip" className="ui-auth-popover">
                v{version} · {commit.slice(0, 8)}
              </p>
            ) : null}
          </header>

          <aside
            className="ui-auth-mobile-art mt-6 h-28 sm:h-36 lg:hidden"
            onPointerMove={parallax}
            aria-hidden
          >
            {art}
          </aside>

          <div className="flex flex-1 items-center py-10 sm:py-14 lg:py-16">
            <div className="w-full max-w-5xl animate-fade-up">{children}</div>
          </div>

          <footer className="mt-auto border-t border-[var(--color-line)] pt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <FooterStrip />
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                <span>
                  v{version} · {commit.slice(0, 8)}
                </span>
                <span className={`ui-auth-health ui-auth-health-${health}`}>{health}</span>
              </div>
            </div>
            <div className="ui-auth-marquee overflow-hidden">
              <div className="flex w-max animate-ui-marquee gap-8 whitespace-nowrap will-change-transform">
                {[0, 1].map((copy) => (
                  <div key={copy} aria-hidden={copy === 1} className="flex gap-8">
                    {FEATURES.map(([name, explanation]) => (
                      <button
                        type="button"
                        key={`${copy}-${name}`}
                        tabIndex={copy === 1 ? -1 : 0}
                        onClick={() => setFeatureTip(featureTip === name ? "" : name)}
                        title={explanation}
                        className="min-h-11 font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] active:text-[var(--color-accent)]"
                      >
                        {name}
                        <span className="ml-8 text-[var(--color-accent)]">/</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {featureTip ? (
              <p role="tooltip" className="mt-2 text-xs text-[var(--color-muted)]">
                {FEATURES.find(([name]) => name === featureTip)?.[1]}
              </p>
            ) : null}
          </footer>
        </div>

        <aside
          className="ui-auth-desktop-art relative hidden lg:col-span-5 lg:block"
          onPointerMove={parallax}
          aria-hidden
        >
          {art}
        </aside>
      </div>
    </main>
  );
}
