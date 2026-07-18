import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "@/components/categories/categories-client";

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: { _count: { select: { transactions: true } } },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
          Categorias
        </h1>
        <p className="text-sm text-muted mt-0.5">
          Organize receitas e despesas do seu jeito.
        </p>
      </div>
      <CategoriesClient
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          color: c.color,
          icon: c.icon,
          monthlyBudget: c.monthlyBudget,
          transactionCount: c._count.transactions,
        }))}
      />
    </div>
  );
}
