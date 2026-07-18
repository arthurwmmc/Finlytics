import "server-only";
import { prisma } from "./prisma";
import { clampDay, currentYM, shiftYM } from "./finance";

/**
 * Lança as ocorrências pendentes de todas as regras recorrentes ativas do
 * usuário, do mês seguinte ao último lançado (ou do mês de criação da regra)
 * até o mês atual, inclusive.
 */
export async function materializePendingRecurring(userId: string) {
  const rules = await prisma.recurringRule.findMany({
    where: { userId, active: true },
  });
  const nowYM = currentYM();

  for (const rule of rules) {
    const startYM = rule.lastPostedMonth
      ? shiftYM(rule.lastPostedMonth, 1)
      : currentYM(rule.createdAt);

    const pending: string[] = [];
    for (let ym = startYM; ym <= nowYM; ym = shiftYM(ym, 1)) {
      pending.push(ym);
      if (pending.length > 24) break; // trava de segurança
    }
    if (pending.length === 0) continue;

    await prisma.$transaction([
      prisma.transaction.createMany({
        data: pending.map((ym) => {
          const [y, m] = ym.split("-").map(Number);
          return {
            description: rule.description,
            amount: rule.amount,
            type: rule.type,
            date: clampDay(y, m - 1, rule.dayOfMonth),
            categoryId: rule.categoryId,
            accountId: rule.accountId,
            creditCardId: rule.creditCardId,
            recurringRuleId: rule.id,
            userId,
          };
        }),
      }),
      prisma.recurringRule.update({
        where: { id: rule.id },
        data: { lastPostedMonth: nowYM },
      }),
    ]);
  }
}
