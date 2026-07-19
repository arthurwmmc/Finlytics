import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Gauge,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  getCashflowSeries,
  getYearCategoryMatrix,
  getYearSummary,
} from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { GlassCard } from "@/components/ui/glass-card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CashflowChart } from "@/components/charts/cashflow-chart";

const MONTH_LABELS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** Fundo sequencial (uma hue, azul) proporcional ao valor da célula. */
function heatBg(value: number, max: number): string | undefined {
  if (value === 0 || max === 0) return undefined;
  const alpha = 0.08 + 0.72 * (value / max);
  return `rgba(8, 153, 219, ${alpha.toFixed(2)})`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = /^\d{4}$/.test(params.y ?? "")
    ? parseInt(params.y!, 10)
    : currentYear;

  const [summary, cashflow, matrix] = await Promise.all([
    getYearSummary(user.id, year),
    getCashflowSeries(user.id, `${year}-12`, 12),
    getYearCategoryMatrix(user.id, year),
  ]);

  // média mensal considera só meses já decorridos do ano corrente
  const elapsedMonths =
    year < currentYear ? 12 : year > currentYear ? 1 : new Date().getMonth() + 1;
  const monthlyAvg = Math.round(summary.expense / elapsedMonths);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
            Relatório anual
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Visão consolidada de {year}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 glass rounded-full px-1.5 py-1">
            <Link
              href={`/reports?y=${year - 1}`}
              className="rounded-full p-1.5 text-muted hover:text-foreground hover:bg-white/10 transition"
              aria-label="Ano anterior"
            >
              <ChevronLeft size={16} />
            </Link>
            <span className="text-sm font-medium min-w-14 text-center">
              {year}
            </span>
            <Link
              href={`/reports?y=${year + 1}`}
              className="rounded-full p-1.5 text-muted hover:text-foreground hover:bg-white/10 transition"
              aria-label="Próximo ano"
            >
              <ChevronRight size={16} />
            </Link>
          </div>
          <a
            href={`/api/export?y=${year}`}
            className="glass glass-hover rounded-full px-4 py-2 text-sm text-muted hover:text-foreground inline-flex items-center gap-1.5"
          >
            <Download size={15} /> Exportar CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={`Receitas em ${year}`}
          value={formatBRL(summary.income)}
          icon={<TrendingUp size={19} />}
          accent="income"
        />
        <StatCard
          label={`Despesas em ${year}`}
          value={formatBRL(summary.expense)}
          icon={<TrendingDown size={19} />}
          accent="expense"
        />
        <StatCard
          label="Economia no ano"
          value={formatBRL(summary.net)}
          icon={<Sparkles size={19} />}
          accent="violet"
        />
        <StatCard
          label="Gasto médio mensal"
          value={formatBRL(monthlyAvg)}
          icon={<Gauge size={19} />}
          accent="cyan"
        />
      </div>

      <GlassCard title={`Fluxo de caixa — ${year}`}>
        <CashflowChart data={cashflow} />
      </GlassCard>

      <GlassCard title="Despesas por categoria, mês a mês">
        {matrix.rows.length === 0 ? (
          <EmptyState
            icon="🛰️"
            title={`Nenhuma despesa lançada em ${year}`}
          />
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-xs tabular border-separate border-spacing-0.5">
              <thead>
                <tr className="text-muted">
                  <th className="text-left font-medium py-2 pr-3 sticky left-0 bg-[#101828]/95 backdrop-blur-sm min-w-36">
                    Categoria
                  </th>
                  {MONTH_LABELS.map((m) => (
                    <th key={m} className="font-medium px-1.5 py-2 min-w-16 text-right">
                      {m}
                    </th>
                  ))}
                  <th className="font-semibold pl-3 py-2 text-right min-w-24">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row) => (
                  <tr key={row.categoryId}>
                    <td className="py-1.5 pr-3 sticky left-0 bg-[#101828]/95 backdrop-blur-sm whitespace-nowrap">
                      {row.icon} {row.name}
                    </td>
                    {row.months.map((value, i) => (
                      <td
                        key={i}
                        className="px-1.5 py-1.5 text-right rounded"
                        style={{ background: heatBg(value, matrix.maxCell) }}
                      >
                        {value > 0 ? formatBRL(value).replace("R$", "").trim() : "·"}
                      </td>
                    ))}
                    <td className="pl-3 py-1.5 text-right font-semibold whitespace-nowrap">
                      {formatBRL(row.total)}
                    </td>
                  </tr>
                ))}
                <tr className="text-muted">
                  <td className="py-2 pr-3 sticky left-0 bg-[#101828]/95 backdrop-blur-sm font-medium">
                    Total do mês
                  </td>
                  {matrix.monthlyTotals.map((value, i) => (
                    <td key={i} className="px-1.5 py-2 text-right font-medium">
                      {value > 0 ? formatBRL(value).replace("R$", "").trim() : "·"}
                    </td>
                  ))}
                  <td className="pl-3 py-2 text-right font-bold text-foreground">
                    {formatBRL(summary.expense)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-[11px] text-muted mt-2">
              Valores em reais; a intensidade do azul acompanha o tamanho do
              gasto no mês.
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
