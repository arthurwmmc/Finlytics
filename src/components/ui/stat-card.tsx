import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function StatCard({
  label,
  value,
  icon,
  delta,
  deltaLabel,
  deltaGoodWhenPositive = true,
  accent = "cyan",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  /** variação percentual vs período anterior; null = sem base de comparação */
  delta?: number | null;
  deltaLabel?: string;
  /** para despesas, subir é ruim — inverte a cor do delta */
  deltaGoodWhenPositive?: boolean;
  accent?: "cyan" | "violet" | "income" | "expense";
}) {
  const accentClasses: Record<string, string> = {
    cyan: "text-accent-cyan bg-accent-cyan/10 border-accent-cyan/20",
    violet: "text-accent-violet bg-accent-violet/10 border-accent-violet/20",
    income: "text-income bg-income/10 border-income/20",
    expense: "text-expense bg-expense/10 border-expense/20",
  };

  let deltaEl: ReactNode = null;
  if (delta !== undefined) {
    if (delta === null) {
      deltaEl = (
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <Minus size={12} aria-hidden /> sem comparação
        </span>
      );
    } else {
      const up = delta >= 0;
      const good = deltaGoodWhenPositive ? up : !up;
      deltaEl = (
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium ${
            good ? "text-income" : "text-expense"
          }`}
        >
          {up ? (
            <ArrowUpRight size={13} aria-label="subiu" />
          ) : (
            <ArrowDownRight size={13} aria-label="caiu" />
          )}
          {Math.abs(delta).toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })}
          % {deltaLabel ?? "vs mês anterior"}
        </span>
      );
    }
  }

  return (
    <div className="glass glass-hover rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
          <p className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold mt-1.5 truncate">
            {value}
          </p>
          {deltaEl && <div className="mt-2">{deltaEl}</div>}
        </div>
        <div
          className={`shrink-0 rounded-xl border p-2.5 ${accentClasses[accent]}`}
          aria-hidden
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
