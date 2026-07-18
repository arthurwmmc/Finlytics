import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RecurringClient } from "@/components/recurring/recurring-client";

export default async function RecurringPage() {
  const user = await requireUser();
  const [rules, categories, accounts, cards] = await Promise.all([
    prisma.recurringRule.findMany({
      where: { userId: user.id },
      include: { category: true, account: true, creditCard: true },
      orderBy: { dayOfMonth: "asc" },
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
      <div>
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
          Despesas fixas e recorrentes
        </h1>
        <p className="text-sm text-muted mt-0.5">
          Contas que se repetem todo mês são lançadas automaticamente.
        </p>
      </div>
      <RecurringClient
        rules={rules.map((rule) => ({
          id: rule.id,
          description: rule.description,
          amount: rule.amount,
          type: rule.type,
          dayOfMonth: rule.dayOfMonth,
          active: rule.active,
          categoryId: rule.categoryId,
          accountId: rule.accountId,
          creditCardId: rule.creditCardId,
          categoryName: rule.category.name,
          categoryIcon: rule.category.icon,
          categoryColor: rule.category.color,
          paymentName: rule.creditCard?.name ?? rule.account?.name ?? "—",
          isCard: !!rule.creditCardId,
        }))}
        categories={categories}
        accounts={accounts}
        cards={cards}
      />
    </div>
  );
}
