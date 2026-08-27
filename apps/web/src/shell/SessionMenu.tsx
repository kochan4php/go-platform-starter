import { usePreferences } from "@starter/ui";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth-context";
import { useConfirm, useToast } from "../lib/ui";

export function SessionMenu({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { soundEnabled, setSoundEnabled, timeZone, setTimeZone } = usePreferences();

  if (!user) return null;

  const initials = user.email.slice(0, 1).toUpperCase();
  const doLogout = async () => {
    const approved = await confirm("Log out?", "Your local query cache will be cleared.", {
      label: "Log out",
    });
    if (!approved) return;
    sessionStorage.setItem("auth:return-to", pathname + search);
    await logout();
    toast("info", "You have been logged out.");
    navigate("/login", { replace: true });
  };
  const go = (to: string) => {
    window.dispatchEvent(new Event("starter:navigation-start"));
    if (document.startViewTransition) document.startViewTransition(() => navigate(to));
    else navigate(to);
  };

  if (collapsed) {
    return (
      <details className="group relative">
        <summary className="ui-hover flex w-full cursor-pointer list-none justify-center rounded-xl p-2.5 text-[var(--color-muted)] transition-colors">
          <span className="flex size-7 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-elevated)] text-xs font-bold">
            {initials}
          </span>
        </summary>
        <div className="absolute bottom-full left-0 z-30 mb-2 w-56 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-2xl">
          <p className="truncate px-3 py-2 text-sm font-semibold">{user.email}</p>
          <p className="px-3 font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            v{user.ver} · {user.perms.length} perms
          </p>
          <hr className="my-1 border-[var(--color-line)]" />
          <button
            type="button"
            onClick={() => go("/admin/settings#profile")}
            className="ui-hover flex w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--color-muted)]"
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => go("/admin/settings")}
            className="ui-hover flex w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--color-muted)]"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={doLogout}
            className="ui-hover-danger flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--color-muted)] transition-colors"
          >
            Log out
          </button>
        </div>
      </details>
    );
  }

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-elevated)] p-3 text-sm transition-colors hover:bg-[var(--color-surface)] list-none">
        <span className="flex size-8 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-xs font-bold">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.email}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            v{user.ver} · {user.perms.length} perms
          </p>
        </div>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-3.5 text-[var(--color-muted)] transition-transform group-open:rotate-180"
          aria-hidden
          focusable="false"
        >
          <title>open</title>
          <path d="m4 6 4 4 4-4" />
        </svg>
      </summary>
      <div className="absolute bottom-full left-0 right-0 z-30 mb-2 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-2xl">
        <button
          type="button"
          onClick={() => go("/admin/settings#profile")}
          className="ui-hover flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[var(--color-muted)] transition-colors"
        >
          Profile
        </button>
        <button
          type="button"
          onClick={() => go("/admin/settings")}
          className="ui-hover flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[var(--color-muted)] transition-colors"
        >
          Settings
        </button>
        <div className="my-1 border-y border-[var(--color-line)] px-3 py-2">
          <label className="block text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            Timezone
            <select
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-elevated)] px-2 py-1 text-xs text-[var(--color-ink)]"
            >
              {timezoneOptions(timeZone).map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 flex items-center justify-between text-xs text-[var(--color-muted)]">
            Sound feedback
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
              className="accent-[var(--color-accent)]"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={doLogout}
          className="ui-hover-danger flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--color-muted)] transition-colors"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-3.5"
            aria-hidden
            focusable="false"
          >
            <title>logout</title>
            <path d="M6 2H3v12h3M10.5 11 14 8l-3.5-3M14 8H6" />
          </svg>
          Log out
        </button>
      </div>
    </details>
  );
}

function timezoneOptions(current: string): string[] {
  const common = [
    "UTC",
    "Asia/Bangkok",
    "Asia/Jakarta",
    "Asia/Singapore",
    "Europe/London",
    "America/New_York",
  ];
  return Array.from(new Set([current, ...common]));
}
