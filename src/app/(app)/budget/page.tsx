import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentYM, monthRange } from "@/lib/finance";
import { MonthSelector } from "@/components/ui/month-selector";
import { BudgetClient } from "@/components/budget/budget-client";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(params.m ?? "") ? params.m! : currentYM();
  const { start, end } = monthRange(ym);

  const categories = await prisma.category.findMany({
    where: { userId: user.id, type: "EXPENSE" },
    orderBy: { name: "asc" },
  });
  const spentByCategory = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId: user.id,
      type: "EXPENSE",
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
            Orçamento mensal
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Defina limites por categoria e acompanhe o consumo do mês.
          </p>
        </div>
        <MonthSelector ym={ym} basePath="/budget" />
      </div>
      <BudgetClient
        items={categories.map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          monthlyBudget: category.monthlyBudget,
          spent:
            spentByCategory.find((g) => g.categoryId === category.id)?._sum
              .amount ?? 0,
        }))}
      />
    </div>
  );
}
