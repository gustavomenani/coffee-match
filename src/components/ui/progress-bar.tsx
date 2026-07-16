export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="w-full">
      {label ? (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-[var(--ink-soft)]">{label}</span>
          <span className="tabular text-[var(--muted)]">
            {value}/{max} · {pct}%
          </span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--paper-deep)]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--carmine-deep)] to-[var(--carmine-hot)] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
