import { formatBRL } from "@/lib/money";

type TooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
};

/** Tooltip em cartão de vidro, compartilhado pelos gráficos. */
export function GlassTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3.5 py-2.5 text-xs shadow-xl">
      {label !== undefined && (
        <p className="text-muted mb-1.5 font-medium">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ background: entry.color }}
              aria-hidden
            />
            <span className="text-foreground/80">{entry.name}</span>
            <span className="ml-auto pl-3 font-semibold tabular">
              {typeof entry.value === "number"
                ? formatBRL(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
