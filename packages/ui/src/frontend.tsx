import {
  Component,
  type DragEvent,
  type ErrorInfo,
  type ReactNode,
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Button, Modal, SkeletonBlock, SkeletonLine } from "./index";

export type Locale = "id" | "en";
type Messages = Record<string, { id: string; en: string }>;

const messages: Messages = {
  "nav.users": { id: "Pengguna", en: "Users" },
  "nav.roles": { id: "Peran & Izin", en: "Roles & Permissions" },
  "nav.settings": { id: "Pengaturan", en: "Settings" },
  "status.offline": {
    id: "Anda sedang offline — beberapa fitur mungkin tidak tersedia.",
    en: "You are offline — some features may be unavailable.",
  },
  "error.title": { id: "Terjadi kesalahan", en: "Something went wrong" },
  "error.retry": { id: "Coba lagi", en: "Try again" },
  "empty.title": { id: "Belum ada data", en: "Nothing here yet" },
};

interface I18nValue {
  locale: Locale;
  setLocale(locale: Locale): void;
  t(key: keyof typeof messages): string;
  plural(count: number, forms: { one: string; other: string }): string;
  date(value: string | Date, options?: Intl.DateTimeFormatOptions): string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  defaultLocale = "id",
}: { children: ReactNode; defaultLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return defaultLocale;
    return window.localStorage.getItem("starter:locale") === "en" ? "en" : defaultLocale;
  });
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") window.localStorage.setItem("starter:locale", next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => messages[key]?.[locale] ?? String(key),
      plural: (count, forms) =>
        new Intl.PluralRules(locale).select(count) === "one" ? forms.one : forms.other,
      date: (input, options) =>
        new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", options).format(
          typeof input === "string" ? new Date(input) : input,
        ),
    }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n outside I18nProvider");
  return value;
}

export function LocaleSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <label className="inline-flex items-center gap-2 text-xs text-[var(--color-muted)]">
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5"
      >
        <option value="id">ID</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}

interface BoundaryProps {
  children: ReactNode;
  title?: string;
  resetKey?: string | number;
  onError?(error: Error, info: ErrorInfo): void;
}

export class WidgetBoundary extends Component<BoundaryProps, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }
  componentDidUpdate(previous: BoundaryProps) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: undefined });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="ui-card p-5" role="alert">
        <h2 className="font-bold">{this.props.title ?? "Widget unavailable"}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          This section failed without affecting the rest of the page.
        </p>
        <Button className="mt-4" variant="ghost" onClick={() => this.setState({ error: undefined })}>
          Try again
        </Button>
      </section>
    );
  }
}

export function WidgetSuspense({
  children,
  label = "Loading widget",
}: { children: ReactNode; label?: string }) {
  return <Suspense fallback={<SkeletonCard label={label} />}>{children}</Suspense>;
}

export function ProgressiveContent({
  pending,
  empty,
  children,
  skeleton = <SkeletonList rows={4} />,
  emptyState = <EmptyState />,
}: {
  pending: boolean;
  empty: boolean;
  children: ReactNode;
  skeleton?: ReactNode;
  emptyState?: ReactNode;
}) {
  if (pending) return <>{skeleton}</>;
  if (empty) return <>{emptyState}</>;
  return <>{children}</>;
}

export function FormErrorSummary({
  errors,
  title = "Periksa kembali formulir",
}: { errors: string[]; title?: string }) {
  if (errors.length === 0) return null;
  return (
    <div role="alert" aria-live="assertive" tabIndex={-1} className="ui-auth-error-summary">
      <strong>{title}</strong>
      <ul className="mt-1 list-disc pl-5">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

export function AccessibleTable({
  caption,
  children,
  className = "",
}: { caption: string; children: ReactNode; className?: string }) {
  return (
    <table className={className}>
      <caption className="sr-only">{caption}</caption>
      {children}
    </table>
  );
}

export function SkeletonCard({ label = "Loading" }: { label?: string }) {
  return (
    <output aria-label={label} className="ui-card block space-y-4 p-5">
      <SkeletonLine w="w-1/3" />
      <SkeletonBlock h="h-24" />
      <SkeletonLine w="w-2/3" />
    </output>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  const rowKeys = useMemo(() => Array.from({ length: rows }, (_, index) => `row-${index + 1}`), [rows]);
  return (
    <output aria-label="Loading list" className="block space-y-3">
      {rowKeys.map((rowKey) => (
        <SkeletonBlock key={rowKey} h="h-12" />
      ))}
    </output>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  const rowKeys = useMemo(() => Array.from({ length: rows }, (_, index) => `row-${index + 1}`), [rows]);
  const columnKeys = useMemo(
    () => Array.from({ length: columns }, (_, index) => `column-${index + 1}`),
    [columns],
  );
  return (
    <output aria-label="Loading table" className="ui-card grid gap-3 p-5">
      {rowKeys.map((rowKey) => (
        <span
          key={rowKey}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {columnKeys.map((columnKey) => (
            <SkeletonLine key={columnKey} />
          ))}
        </span>
      ))}
    </output>
  );
}

export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);
  return settled;
}

export function useThrottledValue<T>(value: T, intervalMs = 100): T {
  const [throttled, setThrottled] = useState(value);
  const last = useRef(0);
  useEffect(() => {
    const wait = Math.max(0, intervalMs - (Date.now() - last.current));
    const timer = window.setTimeout(() => {
      last.current = Date.now();
      setThrottled(value);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [intervalMs, value]);
  return throttled;
}

export function useLocalStorage<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw == null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T) => {
      setValue(next);
      if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(next));
    },
    [key],
  );
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== key || event.newValue == null) return;
      try {
        setValue(JSON.parse(event.newValue) as T);
      } catch {
        /* ignore malformed external values */
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  return [value, set];
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    [query],
  );
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => subscribe(() => setMatches(window.matchMedia(query).matches)), [query, subscribe]);
  return matches;
}

export function useVirtualList({
  count,
  rowHeight,
  viewportHeight,
  scrollTop,
  overscan = 4,
}: {
  count: number;
  rowHeight: number;
  viewportHeight: number;
  scrollTop: number;
  overscan?: number;
}) {
  return useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const end = Math.min(count, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
    return {
      start,
      end,
      paddingTop: start * rowHeight,
      paddingBottom: Math.max(0, (count - end) * rowHeight),
    };
  }, [count, overscan, rowHeight, scrollTop, viewportHeight]);
}

declare global {
  interface Window {
    __STARTER_FLAGS__?: Record<string, boolean>;
  }
}

export function useFeatureFlag(name: string, fallback = false): boolean {
  return typeof window === "undefined" ? fallback : (window.__STARTER_FLAGS__?.[name] ?? fallback);
}

export function DateRangePicker({
  start,
  end,
  onChange,
  label = "Rentang tanggal",
}: {
  start: string;
  end: string;
  onChange(value: { start: string; end: string }): void;
  label?: string;
}) {
  const error = start && end && start > end ? "Tanggal akhir harus setelah tanggal awal." : "";
  const descriptionId = useId();
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2" aria-describedby={error ? descriptionId : undefined}>
      <legend className="ui-label col-span-full">{label}</legend>
      <label>
        <span className="sr-only">Mulai</span>
        <input
          className="ui-input"
          type="date"
          value={start}
          max={end || undefined}
          onChange={(e) => onChange({ start: e.target.value, end })}
        />
      </label>
      <label>
        <span className="sr-only">Selesai</span>
        <input
          className="ui-input"
          type="date"
          value={end}
          min={start || undefined}
          onChange={(e) => onChange({ start, end: e.target.value })}
        />
      </label>
      {error ? (
        <p id={descriptionId} role="alert" className="text-xs text-[var(--color-danger)] sm:col-span-2">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function FileDropzone({
  onFiles,
  accept,
  maxBytes = 5_000_000,
}: {
  onFiles(files: File[]): void;
  accept?: string;
  maxBytes?: number;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const choose = (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    const oversized = selected.find((file) => file.size > maxBytes);
    if (oversized) {
      setError(`${oversized.name} melebihi batas ukuran.`);
      return;
    }
    setError("");
    onFiles(selected);
  };
  return (
    <div>
      <label
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          choose(e.dataTransfer.files);
        }}
        className={`grid min-h-32 cursor-pointer place-items-center rounded-xl border border-dashed p-5 text-center text-sm ${dragging ? "border-[var(--color-accent)] bg-[var(--color-selected)]" : "border-[var(--color-line)]"}`}
      >
        <span>Tarik berkas ke sini atau pilih dari perangkat</span>
        <input
          className="sr-only"
          type="file"
          multiple
          accept={accept}
          onChange={(e) => choose(e.target.files)}
        />
      </label>
      {error ? <Alert message={error} /> : null}
    </div>
  );
}

export function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose(): void }) {
  return (
    <Modal title={alt || "Pratinjau gambar"} size="lg" onClose={onClose}>
      <img src={src} alt={alt} className="max-h-[70vh] w-full object-contain" />
    </Modal>
  );
}

export function EmptyState({
  title = "Belum ada data",
  description,
  action,
  illustration = "◇",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  illustration?: ReactNode;
}) {
  return (
    <section className="grid min-h-40 place-items-center rounded-xl border border-dashed border-[var(--color-line)] p-6 text-center">
      <div>
        <span aria-hidden className="text-3xl text-[var(--color-muted)]">
          {illustration}
        </span>
        <h2 className="mt-2 font-bold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </section>
  );
}

export function StatTrend({
  label,
  value,
  change,
  hint,
}: { label: string; value: ReactNode; change?: number; hint?: string }) {
  const direction = change == null || change === 0 ? "flat" : change > 0 ? "up" : "down";
  return (
    <section className="ui-card p-5">
      <p className="ui-label">{label}</p>
      <div className="mt-3 flex items-end gap-3">
        <strong className="font-mono text-3xl">{value}</strong>
        {change != null ? (
          <span
            aria-label={`${Math.abs(change)} percent ${direction}`}
            className={change >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}
          >
            {direction === "up" ? "↗" : direction === "down" ? "↘" : "→"} {Math.abs(change)}%
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-2 text-xs text-[var(--color-muted)]">{hint}</p> : null}
    </section>
  );
}

export function Timeline({
  items,
}: { items: Array<{ id: string | number; title: string; detail?: string; at?: string }> }) {
  return (
    <ol className="relative border-l border-[var(--color-line)] pl-5">
      {items.map((item) => (
        <li key={item.id} className="relative pb-5 last:pb-0">
          <span className="absolute -left-[1.43rem] top-1 size-2 rounded-full bg-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold">{item.title}</h3>
          {item.detail ? <p className="text-xs text-[var(--color-muted)]">{item.detail}</p> : null}
          {item.at ? (
            <time className="font-mono text-[10px] text-[var(--color-muted)]">{item.at}</time>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function ReorderList<T>({
  items,
  getKey,
  render,
  onReorder,
}: { items: T[]; getKey(item: T): string; render(item: T): ReactNode; onReorder(items: T[]): void }) {
  const dragged = useRef<string | undefined>(undefined);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    onReorder(next);
  };
  const drop = (event: DragEvent, target: string) => {
    event.preventDefault();
    const source = dragged.current;
    if (!source || source === target) return;
    move(
      items.findIndex((item) => getKey(item) === source),
      items.findIndex((item) => getKey(item) === target),
    );
  };
  return (
    <ul>
      {items.map((item, index) => {
        const key = getKey(item);
        return (
          <li
            key={key}
            draggable
            onDragStart={() => {
              dragged.current = key;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => drop(e, key)}
            className="cursor-grab border-b border-[var(--color-line)] p-3 active:cursor-grabbing"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">{render(item)}</div>
              <span className="inline-flex gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  aria-label={`Move ${key} up`}
                  onClick={() => move(index, index - 1)}
                  className="rounded border border-[var(--color-line)] px-2 py-1 disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  aria-label={`Move ${key} down`}
                  onClick={() => move(index, index + 1)}
                  className="rounded border border-[var(--color-line)] px-2 py-1 disabled:opacity-40"
                >
                  ↓
                </button>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
