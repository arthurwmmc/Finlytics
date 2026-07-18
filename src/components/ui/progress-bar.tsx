/**
 * Barra de progresso com estados: ok (accent), atenção (>80%), estourou (>100%).
 * O estado nunca é só cor: o texto percentual acompanha.
 */
export function ProgressBar({
  percent,
  color,
  showOverflow = true,
}: {
  percent: number;
  /** cor custom (ex: cor da categoria); ignorada quando estoura */
  color?: string;
  showOverflow?: boolean;
}) {
  const clamped = Math.min(percent, 100);
  const over = percent > 100;
  const warn = !over && percent > 80;

  const barColor = over
    ? "var(--expense)"
    : warn
      ? "#c98500"
      : (color ?? "var(--accent-cyan)");

  return (
    <div
      className="h-2 rounded-full bg-white/8 overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${clamped}%`,
          background: barColor,
          boxShadow: over && showOverflow ? `0 0 8px ${barColor}` : undefined,
        }}
      />
    </div>
  );
}
