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
  const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
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

/**
 * Saldo de cada conta = saldo inicial + receitas − despesas − pagamentos de
 * fatura − transferências enviadas + transferências recebidas.
 */
export async function getAccountsWithBalances(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  const [outgoing, incoming] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, accountId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["toAccountId"],
      where: { userId, type: "TRANSFER", toAccountId: { not: null } },
      _sum: { amount: true },
    }),
  ]);
  return accounts.map((account) => {
    let balance = account.initialBalance;
    for (const s of outgoing) {
      if (s.accountId !== account.id) continue;
      const amount = s._sum.amount ?? 0;
      if (s.type === "INCOME") balance += amount;
      else balance -= amount; // EXPENSE, TRANSFER (saída) e CARD_PAYMENT
    }
    for (const s of incoming) {
      if (s.toAccountId === account.id) balance += s._sum.amount ?? 0;
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
  const targets: string[] = [];
  for (let i = months - 1; i >= 0; i--) targets.push(shiftYM(ym, -i));
  // dispara todos os meses em paralelo (evita N idas sequenciais ao banco)
  const summaries = await Promise.all(
    targets.map((target) => getMonthlySummary(userId, target))
  );
  return targets.map((target, idx) => {
    const [y, m] = target.split("-").map(Number);
    return {
      ym: target,
      label: new Date(y, m - 1, 1)
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", ""),
      income: summaries[idx].income,
      expense: summaries[idx].expense,
    };
  });
}

/** Despesas do mês agrupadas por categoria, ordenadas da maior para a menor. */
export async function getExpensesByCategory(userId: string, ym: string) {
  const { start, end } = monthRange(ym);
  // groupBy e a lista de categorias em paralelo (a lista do usuário é pequena)
  const [grouped, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.category.findMany({ where: { userId } }),
  ]);
  return grouped
    .map((g) => {
      const category = categories.find((c) => c.id === g.categoryId);
      return {
        categoryId: g.categoryId ?? "sem-categoria",
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
 * Considera transações em contas (compra no cartão não afeta saldo; o
 * CARD_PAYMENT afeta). Transferências entre contas se anulam no agregado e
 * ficam de fora.
 */
function netFromGroups(
  groups: { type: string; _sum: { amount: number | null } }[]
): number {
  let net = 0;
  for (const g of groups) {
    const amount = g._sum.amount ?? 0;
    if (g.type === "INCOME") net += amount;
    else if (g.type === "EXPENSE" || g.type === "CARD_PAYMENT") net -= amount;
    // TRANSFER: neutro no total agregado das contas
  }
  return net;
}

export async function getBalanceSeries(userId: string, ym: string, months = 6) {
  const firstYM = shiftYM(ym, -(months - 1));
  const { start: firstStart } = monthRange(firstYM);

  const targets: string[] = [];
  for (let i = months - 1; i >= 0; i--) targets.push(shiftYM(ym, -i));

  // contas, saldo anterior ao período e os N meses — tudo em paralelo
  const [accounts, before, monthly] = await Promise.all([
    prisma.account.findMany({ where: { userId } }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, accountId: { not: null }, date: { lt: firstStart } },
      _sum: { amount: true },
    }),
    Promise.all(
      targets.map((target) => {
        const { start, end } = monthRange(target);
        return prisma.transaction.groupBy({
          by: ["type"],
          where: {
            userId,
            accountId: { not: null },
            date: { gte: start, lt: end },
          },
          _sum: { amount: true },
        });
      })
    ),
  ]);

  const initialTotal = accounts.reduce((sum, a) => sum + a.initialBalance, 0);
  let running = initialTotal + netFromGroups(before);

  // acumula em ordem cronológica (targets já estão do mais antigo ao atual)
  return targets.map((target, idx) => {
    running += netFromGroups(monthly[idx]);
    const [y, m] = target.split("-").map(Number);
    return {
      ym: target,
      label: new Date(y, m - 1, 1)
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", ""),
      balance: running,
    };
  });
}

/**
 * Mês de referência da fatura ABERTA de um cartão: se o fechamento deste mês
 * já passou, a fatura aberta é a do mês seguinte.
 */
export function openInvoiceYM(closingDay: number, today = new Date()): string {
  const ym = currentYM(today);
  return today.getDate() > closingDay ? shiftYM(ym, 1) : ym;
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

/** Total da fatura de um cartão no mês de referência + pagamentos feitos. */
export async function getInvoiceTotal(
  userId: string,
  cardId: string,
  ym: string,
  closingDay: number,
  dueDay: number
) {
  const { start, end, dueDate } = invoicePeriod(ym, closingDay, dueDay);
  // pagamentos contam do início do período (antecipado, fatura ainda aberta)
  // até um mês após o fechamento (fluxo normal: pagar depois de fechar)
  const nextClosing = new Date(end);
  nextClosing.setMonth(nextClosing.getMonth() + 1);
  const [grouped, payments] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId,
        creditCardId: cardId,
        type: { in: ["EXPENSE", "INCOME"] },
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        creditCardId: cardId,
        type: "CARD_PAYMENT",
        date: { gte: start, lt: nextClosing },
      },
      _sum: { amount: true },
    }),
  ]);
  const expense = grouped.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0;
  const refunds = grouped.find((g) => g.type === "INCOME")?._sum.amount ?? 0;
  return {
    total: expense - refunds,
    paid: payments._sum.amount ?? 0,
    start,
    end,
    dueDate,
  };
}

/**
 * Saldo devedor do cartão (todo o histórico):
 * compras − estornos − pagamentos de fatura, com piso em zero.
 */
export async function getCardOutstanding(userId: string, cardId: string) {
  const grouped = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, creditCardId: cardId },
    _sum: { amount: true },
  });
  const sum = (type: string) =>
    grouped.find((g) => g.type === type)?._sum.amount ?? 0;
  return Math.max(0, sum("EXPENSE") - sum("INCOME") - sum("CARD_PAYMENT"));
}

/** Totais de receita/despesa de um ano inteiro. */
export async function getYearSummary(userId: string, year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const grouped = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      userId,
      type: { in: ["INCOME", "EXPENSE"] },
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });
  const income = grouped.find((g) => g.type === "INCOME")?._sum.amount ?? 0;
  const expense = grouped.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0;
  return { income, expense, net: income - expense };
}

/**
 * Matriz de despesas categoria × mês de um ano, ordenada pelo total anual.
 * Volume pessoal é pequeno — agrega em memória.
 */
export async function getYearCategoryMatrix(userId: string, year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, type: "EXPENSE", date: { gte: start, lt: end } },
      select: { amount: true, date: true, categoryId: true },
    }),
    prisma.category.findMany({ where: { userId, type: "EXPENSE" } }),
  ]);

  const byCategory = new Map<string, number[]>();
  for (const tx of transactions) {
    const key = tx.categoryId ?? "sem-categoria";
    const months = byCategory.get(key) ?? Array(12).fill(0);
    months[tx.date.getMonth()] += tx.amount;
    byCategory.set(key, months);
  }

  const rows = [...byCategory.entries()]
    .map(([categoryId, months]) => {
      const category = categories.find((c) => c.id === categoryId);
      return {
        categoryId,
        name: category?.name ?? "Sem categoria",
        icon: category?.icon ?? "📦",
        color: category?.color ?? "#8b93a7",
        months,
        total: months.reduce((sum, v) => sum + v, 0),
      };
    })
    .sort((a, b) => b.total - a.total);

  const monthlyTotals = Array(12).fill(0) as number[];
  for (const row of rows)
    row.months.forEach((v, i) => (monthlyTotals[i] += v));

  const maxCell = rows.reduce(
    (max, row) => Math.max(max, ...row.months),
    0
  );

  return { rows, monthlyTotals, maxCell };
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
