import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentYM, monthRange } from "@/lib/finance";
import { MonthSelector } from "@/components/ui/month-selector";
import { TransactionsClient } from "@/components/transactions/transactions-client";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(params.m ?? "") ? params.m! : currentYM();
  const { start, end } = monthRange(ym);

  const [transactions, categories, accounts, cards] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: start, lt: end } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
    prisma.creditCard.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
            Transações
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Todas as movimentações do mês, em contas e cartões.
          </p>
        </div>
        <MonthSelector ym={ym} basePath="/transactions" />
      </div>

      <TransactionsClient
        transactions={transactions.map((tx) => ({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          date: tx.date.toISOString(),
          type: tx.type,
          categoryId: tx.categoryId,
          accountId: tx.accountId,
          toAccountId: tx.toAccountId,
          creditCardId: tx.creditCardId,
          installmentGroupId: tx.installmentGroupId,
          installmentNumber: tx.installmentNumber,
          installmentTotal: tx.installmentTotal,
          recurringRuleId: tx.recurringRuleId,
        }))}
        categories={categories}
        accounts={accounts}
        cards={cards}
      />
    </div>
  );
}
