import Link from "next/link";
import {
  ArrowLeftRight,
  CreditCard,
  PiggyBank,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  Sparkles,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  currentYM,
  getAccountsWithBalances,
  getBalanceSeries,
  getBudgetProgress,
  getCashflowSeries,
  getExpensesByCategory,
  getInvoiceTotal,
  getMonthlySummary,
  monthRange,
  openInvoiceYM,
  shiftYM,
} from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { GlassCard } from "@/components/ui/glass-card";
import { StatCard } from "@/components/ui/stat-card";
import { MonthSelector } from "@/components/ui/month-selector";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { CashflowChart } from "@/components/charts/cashflow-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { BalanceAreaChart } from "@/components/charts/balance-area-chart";

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const hasExplicitYM = /^\d{4}-\d{2}$/.test(params.m ?? "");
  const ym = hasExplicitYM ? params.m! : currentYM();

  const [
    summary,
    prevSummary,
    accounts,
    cashflow,
    byCategory,
    balanceSeries,
    budgets,
    goals,
    cards,
  ] = await Promise.all([
    getMonthlySummary(user.id, ym),
    getMonthlySummary(user.id, shiftYM(ym, -1)),
    getAccountsWithBalances(user.id),
    getCashflowSeries(user.id, ym),
    getExpensesByCategory(user.id, ym),
    getBalanceSeries(user.id, ym),
    getBudgetProgress(user.id, ym),
    prisma.goal.findMany({
      where: { userId: user.id },
      include: { contributions: true },
      orderBy: { createdAt: "asc" },
      take: 4,
    }),
    prisma.creditCard.findMany({ where: { userId: user.id } }),
  ]);

  const { start, end } = monthRange(ym);
  const recentTx = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: start, lt: end } },
    include: { category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 6,
  });

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const invoices = await Promise.all(
    cards.map(async (card) => ({
      card,
      // sem mês explícito, mostra a fatura aberta de cada cartão
      invoice: await getInvoiceTotal(
        user.id,
        card.id,
        hasExplicitYM ? ym : openInvoiceYM(card.closingDay),
        card.closingDay,
        card.dueDay
      ),
    }))
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
            Olá, {user.name.split(" ")[0]} <span aria-hidden>👋</span>
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Resumo das suas finanças pessoais.
          </p>
        </div>
        <MonthSelector ym={ym} basePath="/" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Saldo total"
          value={formatBRL(totalBalance)}
          icon={<Wallet size={19} />}
          accent="cyan"
        />
        <StatCard
          label="Receitas do mês"
          value={formatBRL(summary.income)}
          icon={<TrendingUp size={19} />}
          accent="income"
          delta={pctDelta(summary.income, prevSummary.income)}
        />
        <StatCard
          label="Despesas do mês"
          value={formatBRL(summary.expense)}
          icon={<TrendingDown size={19} />}
          accent="expense"
          delta={pctDelta(summary.expense, prevSummary.expense)}
          deltaGoodWhenPositive={false}
        />
        <StatCard
          label="Economia do mês"
          value={formatBRL(summary.net)}
          icon={<Sparkles size={19} />}
          accent="violet"
          delta={pctDelta(summary.net, prevSummary.net)}
        />
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <GlassCard title="Fluxo de caixa — últimos 6 meses" className="xl:col-span-2">
          <CashflowChart data={cashflow} />
        </GlassCard>
        <GlassCard title="Despesas por categoria">
          {byCategory.length === 0 ? (
            <EmptyState
              icon="🌌"
              title="Sem despesas neste mês"
              description="Lance transações para ver a distribuição."
            />
          ) : (
            <CategoryDonut data={byCategory} />
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <GlassCard title="Evolução do saldo em contas">
          <BalanceAreaChart data={balanceSeries} />
        </GlassCard>
        <GlassCard
          title="Orçamento do mês"
          action={
            <Link
              href="/budget"
              className="text-xs text-accent-cyan hover:underline"
            >
              gerenciar
            </Link>
          }
        >
          {budgets.length === 0 ? (
            <EmptyState
              icon="🛰️"
              title="Nenhum orçamento definido"
              description="Defina limites por categoria na página Orçamento."
              action={
                <Link
                  href="/budget"
                  className="btn-gradient rounded-xl px-4 py-2 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                >
                  <PiggyBank size={14} /> Definir orçamentos
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3.5">
              {budgets.slice(0, 6).map(({ category, spent, limit, percent }) => (
                <li key={category.id}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="truncate">
                      {category.icon} {category.name}
                    </span>
                    <span
                      className={`tabular text-xs ${
                        percent > 100
                          ? "text-expense font-semibold"
                          : "text-muted"
                      }`}
                    >
                      {formatBRL(spent)} / {formatBRL(limit)} ·{" "}
                      {Math.round(percent)}%
                    </span>
                  </div>
                  <ProgressBar percent={percent} color={category.color} />
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      {/* Widgets secundários */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard
          title="Metas"
          action={
            <Link
              href="/goals"
              className="text-xs text-accent-cyan hover:underline"
            >
              ver todas
            </Link>
          }
        >
          {goals.length === 0 ? (
            <EmptyState
              icon="🎯"
              title="Nenhuma meta ainda"
              action={
                <Link
                  href="/goals"
                  className="btn-gradient rounded-xl px-4 py-2 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                >
                  <Target size={14} /> Criar meta
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3.5">
              {goals.map((goal) => {
                const saved = goal.contributions.reduce(
                  (sum, c) => sum + c.amount,
                  0
                );
                const percent = (saved / goal.targetAmount) * 100;
                return (
                  <li key={goal.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="truncate">
                        {goal.icon} {goal.name}
                      </span>
                      <span className="tabular text-xs text-muted">
                        {Math.min(100, Math.round(percent))}%
                      </span>
                    </div>
                    <ProgressBar percent={percent} color={goal.color} />
                    <p className="text-[11px] text-muted mt-1 tabular">
                      {formatBRL(saved)} de {formatBRL(goal.targetAmount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        <GlassCard
          title="Faturas dos cartões"
          action={
            <Link
              href="/cards"
              className="text-xs text-accent-cyan hover:underline"
            >
              ver cartões
            </Link>
          }
        >
          {invoices.length === 0 ? (
            <EmptyState
              icon="💳"
              title="Nenhum cartão cadastrado"
              action={
                <Link
                  href="/cards"
                  className="btn-gradient rounded-xl px-4 py-2 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                >
                  <CreditCard size={14} /> Adicionar cartão
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3">
              {invoices.map(({ card, invoice }) => (
                <li
                  key={card.id}
                  className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/8 px-3.5 py-3"
                >
                  <span
                    className="size-9 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ background: card.color }}
                    aria-hidden
                  >
                    <CreditCard size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{card.name}</p>
                    <p className="text-[11px] text-muted">
                      vence {invoice.dueDate.toLocaleDateString("pt-BR")}
                      {invoice.total > 0 && invoice.paid >= invoice.total && (
                        <span className="text-income"> · paga ✓</span>
                      )}
                    </p>
                  </div>
                  <span className="tabular text-sm font-semibold">
                    {formatBRL(invoice.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard
          title="Últimas transações"
          action={
            <Link
              href="/transactions"
              className="text-xs text-accent-cyan hover:underline"
            >
              ver todas
            </Link>
          }
        >
          {recentTx.length === 0 ? (
            <EmptyState
              icon="✨"
              title="Nada lançado neste mês"
              action={
                <Link
                  href="/transactions"
                  className="btn-gradient rounded-xl px-4 py-2 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                >
                  <ArrowLeftRight size={14} /> Nova transação
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {recentTx.map((tx) => {
                const label =
                  tx.category?.name ??
                  (tx.type === "TRANSFER"
                    ? "Transferência"
                    : "Pagamento de fatura");
                const icon =
                  tx.category?.icon ??
                  (tx.type === "TRANSFER" ? "🔁" : "💸");
                return (
                  <li key={tx.id} className="flex items-center gap-3">
                    <span
                      className="size-8 rounded-lg flex items-center justify-center text-sm shrink-0 border border-white/10"
                      style={{
                        background: tx.category
                          ? `${tx.category.color}26`
                          : "rgba(34,211,238,0.12)",
                      }}
                      aria-hidden
                    >
                      {icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{tx.description}</p>
                      <p className="text-[11px] text-muted">
                        {tx.date.toLocaleDateString("pt-BR")} · {label}
                      </p>
                    </div>
                    <span
                      className={`tabular text-sm font-semibold ${
                        tx.type === "INCOME"
                          ? "text-income"
                          : tx.type === "EXPENSE"
                            ? "text-expense"
                            : "text-accent-cyan"
                      }`}
                    >
                      {tx.type === "INCOME"
                        ? "+"
                        : tx.type === "EXPENSE"
                          ? "−"
                          : ""}
                      {formatBRL(tx.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
