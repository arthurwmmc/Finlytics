import "server-only";
import { prisma } from "./prisma";

/** "2026-07" → { start, end } cobrindo o mês inteiro (end exclusivo). */
export function monthRange(ym: string): { start: Date; end: Date } {
  const [y, m] = ym.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

export function currentYM(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftYM(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return currentYM(d);
}

export function ymLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

/** Dia clampado para não estourar o fim do mês (ex: dia 31 em fevereiro). */
export function clampDay(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDay), 12);
}

/** Receita e despesa totais (contas + cartões) de um mês, em centavos. */
export async function getMonthlySummary(userId: string, ym: string) {
  const { start, end } = monthRange(ym);
  const grouped = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, date: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  const income = grouped.find((g) => g.type === "INCOME")?._sum.amount ?? 0;
  const expense = grouped.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0;
  return { income, expense, net: income - expense };
}

/** Saldo de cada conta = saldo inicial + receitas - despesas lançadas nela. */
export async function getAccountsWithBalances(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  const sums = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: { userId, accountId: { not: null } },
    _sum: { amount: true },
  });
  return accounts.map((account) => {
    let balance = account.initialBalance;
    for (const s of sums) {
      if (s.accountId !== account.id) continue;
      balance += (s.type === "INCOME" ? 1 : -1) * (s._sum.amount ?? 0);
    }
    return { ...account, balance };
  });
}

/** Série mensal receita × despesa dos últimos N meses (incluindo o mês dado). */
export async function getCashflowSeries(
  userId: string,
  ym: string,
  months = 6
) {
  const result: { ym: string; label: string; income: number; expense: number }[] =
    [];
  for (let i = months - 1; i >= 0; i--) {
    const target = shiftYM(ym, -i);
    const { income, expense } = await getMonthlySummary(userId, target);
    const [y, m] = target.split("-").map(Number);
    result.push({
      ym: target,
      label: new Date(y, m - 1, 1)
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", ""),
      income,
      expense,
    });
  }
  return result;
}

/** Despesas do mês agrupadas por categoria, ordenadas da maior para a menor. */
export async function getExpensesByCategory(userId: string, ym: string) {
  const { start, end } = monthRange(ym);
  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type: "EXPENSE", date: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  const categories = await prisma.category.findMany({
    where: { userId, id: { in: grouped.map((g) => g.categoryId) } },
  });
  return grouped
    .map((g) => {
      const category = categories.find((c) => c.id === g.categoryId);
      return {
        categoryId: g.categoryId,
        name: category?.name ?? "?",
        color: category?.color ?? "#8b93a7",
        icon: category?.icon ?? "❓",
        total: g._sum.amount ?? 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/**
 * Evolução do saldo total das contas ao fim de cada um dos últimos N meses.
 * Considera apenas transações em contas (cartão não afeta saldo até ser pago).
 */
export async function getBalanceSeries(userId: string, ym: string, months = 6) {
  const accounts = await prisma.account.findMany({ where: { userId } });
  const initialTotal = accounts.reduce((sum, a) => sum + a.initialBalance, 0);

  const firstYM = shiftYM(ym, -(months - 1));
  const { start: firstStart } = monthRange(firstYM);

  const before = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, accountId: { not: null }, date: { lt: firstStart } },
    _sum: { amount: true },
  });
  let running =
    initialTotal +
    (before.find((g) => g.type === "INCOME")?._sum.amount ?? 0) -
    (before.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0);

  const series: { ym: string; label: string; balance: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const target = shiftYM(ym, -i);
    const { start, end } = monthRange(target);
    const grouped = await prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId,
        accountId: { not: null },
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });
    running +=
      (grouped.find((g) => g.type === "INCOME")?._sum.amount ?? 0) -
      (grouped.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0);
    const [y, m] = target.split("-").map(Number);
    series.push({
      ym: target,
      label: new Date(y, m - 1, 1)
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", ""),
      balance: running,
    });
  }
  return series;
}

/**
 * Período da fatura de um cartão para o mês de referência `ym`.
 * A fatura do mês M fecha no dia `closingDay` de M e cobre as compras desde o
 * fechamento anterior (exclusivo o dia do fechamento anterior... convenção:
 * início = dia seguinte ao fechamento de M-1, fim = dia do fechamento de M,
 * inclusive).
 */
export function invoicePeriod(
  ym: string,
  closingDay: number,
  dueDay: number
): { start: Date; end: Date; dueDate: Date } {
  const [y, m] = ym.split("-").map(Number);
  const closing = clampDay(y, m - 1, closingDay);
  const prevClosing = clampDay(y, m - 2, closingDay);
  const start = new Date(
    prevClosing.getFullYear(),
    prevClosing.getMonth(),
    prevClosing.getDate() + 1
  );
  const end = new Date(
    closing.getFullYear(),
    closing.getMonth(),
    closing.getDate() + 1
  ); // exclusivo
  // vencimento: no mesmo mês se dueDay > closingDay, senão no mês seguinte
  const dueDate =
    dueDay > closingDay ? clampDay(y, m - 1, dueDay) : clampDay(y, m, dueDay);
  return { start, end, dueDate };
}

/** Total da fatura de um cartão no mês de referência. */
export async function getInvoiceTotal(
  userId: string,
  cardId: string,
  ym: string,
  closingDay: number,
  dueDay: number
) {
  const { start, end, dueDate } = invoicePeriod(ym, closingDay, dueDay);
  const grouped = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      userId,
      creditCardId: cardId,
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });
  const expense = grouped.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0;
  const refunds = grouped.find((g) => g.type === "INCOME")?._sum.amount ?? 0;
  return { total: expense - refunds, start, end, dueDate };
}

/** Orçamentos: consumo do mês por categoria com limite definido. */
export async function getBudgetProgress(userId: string, ym: string) {
  const { start, end } = monthRange(ym);
  const budgeted = await prisma.category.findMany({
    where: { userId, type: "EXPENSE", monthlyBudget: { not: null } },
    orderBy: { name: "asc" },
  });
  if (budgeted.length === 0) return [];
  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      categoryId: { in: budgeted.map((c) => c.id) },
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });
  return budgeted.map((category) => {
    const spent =
      grouped.find((g) => g.categoryId === category.id)?._sum.amount ?? 0;
    return {
      category,
      spent,
      limit: category.monthlyBudget!,
      percent: (spent / category.monthlyBudget!) * 100,
    };
  });
}
