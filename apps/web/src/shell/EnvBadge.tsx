export function EnvBadge({ env }: { env: string }) {
  const upper = env.toUpperCase();
  if (upper === "PROD") return null;
  const color =
    upper === "UAT"
      ? "border-[var(--color-warning)]/30 text-[var(--color-warning)]"
      : upper === "DEMO"
        ? "border-[var(--color-accent)]/30 text-[var(--color-accent)]"
        : "border-[var(--color-accent)]/30 text-[var(--color-accent)]";
  return (
    <span
      title={`Environment: ${upper}`}
      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-widest ${color}`}
    >
      {upper}
    </span>
  );
}
