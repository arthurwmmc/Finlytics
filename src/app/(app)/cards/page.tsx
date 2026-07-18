import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentYM, getInvoiceTotal, invoicePeriod } from "@/lib/finance";
import { MonthSelector } from "@/components/ui/month-selector";
import { CardsClient } from "@/components/cards/cards-client";
import type { InvoiceData } from "@/components/cards/cards-client";

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(params.m ?? "") ? params.m! : currentYM();

  const cards = await prisma.creditCard.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  const invoices: InvoiceData[] = await Promise.all(
    cards.map(async (card) => {
      const { total, start, end, dueDate } = await getInvoiceTotal(
        user.id,
        card.id,
        ym,
        card.closingDay,
        card.dueDay
      );
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          creditCardId: card.id,
          date: { gte: start, lt: end },
        },
        include: { category: true },
        orderBy: { date: "desc" },
      });
      // comprometido = fatura atual em aberto + parcelas futuras
      const { start: currentStart } = invoicePeriod(
        currentYM(),
        card.closingDay,
        card.dueDay
      );
      const committed = await prisma.transaction.groupBy({
        by: ["type"],
        where: {
          userId: user.id,
          creditCardId: card.id,
          date: { gte: currentStart },
        },
        _sum: { amount: true },
      });
      const used =
        (committed.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0) -
        (committed.find((g) => g.type === "INCOME")?._sum.amount ?? 0);

      return {
        card: {
          id: card.id,
          name: card.name,
          brand: card.brand,
          color: card.color,
          limit: card.limit,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
        },
        total,
        used,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        dueDate: dueDate.toISOString(),
        transactions: transactions.map((tx) => ({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          date: tx.date.toISOString(),
          categoryName: tx.category.name,
          categoryIcon: tx.category.icon,
          categoryColor: tx.category.color,
        })),
      };
    })
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
            Cartões de crédito
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Faturas, limites e parcelamentos.
          </p>
        </div>
        <MonthSelector ym={ym} basePath="/cards" />
      </div>
      <CardsClient invoices={invoices} />
    </div>
  );
}
