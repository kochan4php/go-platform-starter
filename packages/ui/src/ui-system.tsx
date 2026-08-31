import {
  type ReactNode,
  type RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */

type ToastKind = "success" | "error" | "info";
type ToastAction = { label: string; run(): void };

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}

export interface ToastApi {
  (kind: ToastKind, message: string): void;
  (kind: ToastKind, message: string, action?: ToastAction): void;
  undo(message: string, run: () => void, opts?: { timeoutMs?: number }): void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast outside ToastProvider");
  return ctx;
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback<ToastApi>(
    ((kind: ToastKind, message: string, action?: ToastAction) => {
      const id = ++toastId;
      const item: ToastItem = { id, kind, message, action };
      setItems((cur) => [...cur, item]);
      window.dispatchEvent(new CustomEvent("starter:toast", { detail: { kind } }));
      if (!action) {
        setTimeout(() => {
          setItems((cur) => cur.filter((t) => t.id !== id));
        }, 4500);
      }
    }) as ToastApi,
    [],
  );

  toast.undo = (message: string, run: () => void, opts) => {
    const id = ++toastId;
    setItems((cur) => [...cur, { id, kind: "info", message, action: { label: "Undo", run } }]);
    window.dispatchEvent(new CustomEvent("starter:toast", { detail: { kind: "info" } }));
    setTimeout(() => {
      setItems((cur) => cur.filter((t) => t.id !== id));
    }, opts?.timeoutMs ?? 5500);
  };

  const value = useMemo(() => toast, [toast]);

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: ToastKind; message?: string }>).detail;
      if (!detail?.message) return;
      toast(detail.kind ?? "info", detail.message);
    };
    window.addEventListener("starter:toast-request", receive);
    return () => window.removeEventListener("starter:toast-request", receive);
  }, [toast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[var(--z-overlay)] flex max-w-sm flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-up pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${
              t.kind === "success"
                ? "ui-toast-success"
                : t.kind === "error"
                  ? "ui-toast-error"
                  : "border-[var(--color-line)] bg-[var(--color-elevated)]/90 text-[var(--color-ink)]"
            }`}
          >
            <span
              className={`block size-2 shrink-0 rounded-full ${
                t.kind === "success"
                  ? "bg-[var(--color-success)]"
                  : t.kind === "error"
                    ? "bg-[var(--color-danger)]"
                    : "bg-[var(--color-accent)]"
              }`}
            />
            <span className="flex-1">{t.message}</span>
            {t.action ? (
              <button
                type="button"
                onClick={() => {
                  t.action?.run();
                  setItems((cur) => cur.filter((x) => x.id !== t.id));
                }}
                className="rounded-md border border-current/30 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-widest transition-opacity hover:opacity-80"
              >
                {t.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Confirm dialog (promise-based)                                     */
/* ------------------------------------------------------------------ */

interface ConfirmState {
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

export type ConfirmFn = (
  message: string,
  detail?: string,
  opts?: { danger?: boolean; label?: string; cancelLabel?: string },
) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmFn | null>(null);

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapTab(event: KeyboardEvent, root: HTMLElement | null) {
  if (event.key !== "Tab" || !root) return;
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => !node.hasAttribute("hidden") && node.getAttribute("aria-hidden") !== "true",
  );
  if (nodes.length === 0) {
    event.preventDefault();
    root.focus();
    return;
  }
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm outside ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (message, detail, opts) =>
      new Promise<boolean>((resolve) => {
        setState({
          message,
          detail,
          danger: opts?.danger,
          confirmLabel: opts?.label,
          cancelLabel: opts?.cancelLabel,
          resolve,
        });
      }),
    [],
  );

  const close = useCallback(
    (ok: boolean) => {
      state?.resolve(ok);
      setState(null);
    },
    [state],
  );

  useEffect(() => {
    if (!state) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      else if (e.key === "Enter") close(true);
      else trapTab(e, dialogRef.current);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [state, close]);

  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!state || !dialogRef.current) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current.focus();
    return () => previous?.focus?.();
  }, [state]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state
        ? createPortal(
            <div className="ui-modal-backdrop fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 backdrop-blur-[6px]">
              <div
                ref={dialogRef}
                tabIndex={-1}
                // biome-ignore lint/a11y/useSemanticElements: native <dialog> lacks Tailwind+JSX ergonomics here
                role="dialog"
                aria-modal="true"
                aria-label={state.message}
                className="ui-modal-panel w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
              >
                <h3 className="text-base font-bold tracking-tight">{state.message}</h3>
                {state.detail ? (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{state.detail}</p>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => close(false)}
                    className="rounded-xl border border-[var(--color-line)] px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
                  >
                    {state.cancelLabel ?? "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => close(true)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                      state.danger
                        ? "bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/80"
                        : "bg-[var(--color-ink)] text-[var(--color-canvas)] hover:opacity-88"
                    }`}
                  >
                    {state.confirmLabel ?? "Confirm"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </ConfirmCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Drawer with focus trap + ESC                                       */
/* ------------------------------------------------------------------ */

interface DrawerState {
  title: string;
  content: ReactNode;
  onClose?: () => void;
}

interface DrawerApi {
  open(opts: { title: string; content: ReactNode; onClose?: () => void }): void;
  close(): void;
}

const DrawerContext = createContext<DrawerApi | null>(null);

export function useDrawer(): DrawerApi {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer outside DrawerProvider");
  return ctx;
}

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DrawerState | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const value = useMemo<DrawerApi>(
    () => ({
      open(opts) {
        setState({ title: opts.title, content: opts.content, onClose: opts.onClose });
      },
      close() {
        setState((cur) => {
          cur?.onClose?.();
          return null;
        });
      },
    }),
    [],
  );

  useEffect(() => {
    if (!state) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") value.close();
      else trapTab(e, panelRef.current);
    };
    const previous = document.activeElement as HTMLElement | null;
    window.addEventListener("keydown", fn);
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", fn);
      previous?.focus?.();
    };
  }, [state, value]);

  useEffect(() => {
    if (!state) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [state]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
      {state
        ? createPortal(
            <div className="fixed inset-0 z-[var(--z-drawer)] flex">
              <button
                type="button"
                aria-label="Close drawer"
                onClick={() => value.close()}
                className="ui-modal-backdrop flex-1 backdrop-blur-[6px]"
              />
              <div
                ref={panelRef}
                tabIndex={-1}
                // biome-ignore lint/a11y/useSemanticElements: native <dialog> lacks Tailwind+JSX ergonomics here
                role="dialog"
                aria-modal="true"
                aria-label={state.title}
                className="flex w-full max-w-md flex-col border-l border-[var(--color-line)] bg-[var(--color-surface)] shadow-2xl animate-slide-in-right"
              >
                <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-3">
                  <h2 className="text-sm font-bold tracking-tight">{state.title}</h2>
                  <button
                    type="button"
                    onClick={() => value.close()}
                    aria-label="Close"
                    className="rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
                  >
                    ×
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">{state.content}</div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </DrawerContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Connectivity + page visibility                                     */
/* ------------------------------------------------------------------ */

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => (typeof document === "undefined" ? true : !document.hidden));
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  return visible;
}

/* ------------------------------------------------------------------ */
/*  Copy to clipboard hook                                             */
/* ------------------------------------------------------------------ */

export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    });
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return [copied, copy];
}

/* ------------------------------------------------------------------ */
/*  Relative time + number formatting                                  */
/* ------------------------------------------------------------------ */

export function relativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (mins < 1) return rtf.format(0, "minute");
  if (mins < 60) return rtf.format(-mins, "minute");
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return rtf.format(-hrs, "hour");
  const days = Math.floor(hrs / 24);
  if (days < 30) return rtf.format(-days, "day");
  return d.toLocaleDateString();
}

export function formatDateTime(
  date: string | Date,
  timeZone?: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
    ...options,
  }).format(value);
}

export function formatNumber(value: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(undefined, opts).format(value);
}

/* ------------------------------------------------------------------ */
/*  Persistence helper                                                 */
/* ------------------------------------------------------------------ */

export function useStored<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("starter:storage", { detail: { key, value: next } }));
      } catch {
        /* ignore quota errors */
      }
    },
    [key],
  );
  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; value: T }>).detail;
      if (detail?.key === key) setValue(detail.value);
    };
    window.addEventListener("starter:storage", sync);
    return () => window.removeEventListener("starter:storage", sync);
  }, [key]);
  return [value, set];
}

/* ------------------------------------------------------------------ */
/*  Per-user display preferences                                      */
/* ------------------------------------------------------------------ */

export interface UserPreferences {
  userKey: string;
  timeZone: string;
  soundEnabled: boolean;
  setTimeZone(value: string): void;
  setSoundEnabled(value: boolean): void;
}

const PreferencesCtx = createContext<UserPreferences | null>(null);

export function PreferencesProvider({ userKey, children }: { userKey: string; children: ReactNode }) {
  const fallbackZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [stored, setStored] = useStored<{ timeZone: string; soundEnabled: boolean }>(
    `ui-preferences:${userKey}`,
    { timeZone: fallbackZone, soundEnabled: false },
  );

  useEffect(() => {
    if (!stored.soundEnabled) return;
    const play = () => {
      const AudioContextCtor = window.AudioContext;
      if (!AudioContextCtor) return;
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 520;
      gain.gain.setValueAtTime(0.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.09);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.09);
      oscillator.addEventListener("ended", () => context.close());
    };
    window.addEventListener("starter:toast", play);
    return () => window.removeEventListener("starter:toast", play);
  }, [stored.soundEnabled]);

  const value = useMemo<UserPreferences>(
    () => ({
      userKey,
      timeZone: stored.timeZone,
      soundEnabled: stored.soundEnabled,
      setTimeZone: (timeZone) => setStored({ ...stored, timeZone }),
      setSoundEnabled: (soundEnabled) => setStored({ ...stored, soundEnabled }),
    }),
    [userKey, stored, setStored],
  );
  return <PreferencesCtx.Provider value={value}>{children}</PreferencesCtx.Provider>;
}

export function usePreferences(): UserPreferences {
  const ctx = useContext(PreferencesCtx);
  if (!ctx) throw new Error("usePreferences outside PreferencesProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  ScrollToTop                                                        */
/* ------------------------------------------------------------------ */

export function ScrollToTop({
  threshold = 400,
  targetRef,
}: {
  threshold?: number;
  targetRef?: RefObject<HTMLElement | null>;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const target = targetRef?.current;
    const onScroll = () => setShow((target?.scrollTop ?? window.scrollY) > threshold);
    onScroll();
    const source: Window | HTMLElement = target ?? window;
    source.addEventListener("scroll", onScroll, { passive: true });
    return () => source.removeEventListener("scroll", onScroll);
  }, [threshold, targetRef]);

  if (!show) return null;
  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => {
        if (targetRef?.current) targetRef.current.scrollTo({ top: 0, behavior: "smooth" });
        else window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="fixed bottom-20 right-4 z-[var(--z-floating)] flex size-9 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-elevated)]/90 text-[var(--color-muted)] shadow-lg backdrop-blur transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] lg:bottom-5 lg:right-5"
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="size-4"
        aria-hidden
        focusable="false"
      >
        <title>up</title>
        <path d="m8 12 4-5H4l4 5Z" />
      </svg>
    </button>
  );
}
