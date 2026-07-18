import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoalsClient } from "@/components/goals/goals-client";

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    include: { contributions: { orderBy: { date: "desc" } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
          Metas de economia
        </h1>
        <p className="text-sm text-muted mt-0.5">
          Objetivos com valor-alvo, prazo e aportes.
        </p>
      </div>
      <GoalsClient
        goals={goals.map((goal) => ({
          id: goal.id,
          name: goal.name,
          icon: goal.icon,
          color: goal.color,
          targetAmount: goal.targetAmount,
          targetDate: goal.targetDate?.toISOString() ?? null,
          contributions: goal.contributions.map((c) => ({
            id: c.id,
            amount: c.amount,
            date: c.date.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
