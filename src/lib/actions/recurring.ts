"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseBRL } from "@/lib/money";
import { currentYM, shiftYM } from "@/lib/finance";
import type { ActionState } from "./transactions";

function parseRule(formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const amount = parseBRL(String(formData.get("amount") ?? ""));
  const type = String(formData.get("type") ?? "");
  const dayOfMonth = parseInt(String(formData.get("dayOfMonth") ?? ""), 10);
  const categoryId = String(formData.get("categoryId") ?? "");
  const payment = String(formData.get("payment") ?? "");

  if (!description) return { error: "Informe uma descrição." } as const;
  if (!Number.isFinite(amount) || amount <= 0)
    return { error: "Valor inválido." } as const;
  if (type !== "INCOME" && type !== "EXPENSE")
    return { error: "Tipo inválido." } as const;
  if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)
    return { error: "Dia do mês deve estar entre 1 e 31." } as const;
  if (!categoryId) return { error: "Escolha uma categoria." } as const;

  const [kind, refId] = payment.split(":");
  if ((kind !== "account" && kind !== "card") || !refId)
    return { error: "Escolha a conta ou cartão." } as const;

  return {
    description,
    amount,
    type,
    dayOfMonth,
    categoryId,
    accountId: kind === "account" ? refId : null,
    creditCardId: kind === "card" ? refId : null,
  } as const;
}

export async function createRecurringRule(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseRule(formData);
  if ("error" in parsed) return parsed;

  // marca o mês anterior como já lançado: a 1ª ocorrência sai no mês atual
  await prisma.recurringRule.create({
    data: {
      ...parsed,
      userId: user.id,
      lastPostedMonth: shiftYM(currentYM(), -1),
    },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateRecurringRule(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.recurringRule.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Recorrência não encontrada." };
  const parsed = parseRule(formData);
  if ("error" in parsed) return parsed;
  await prisma.recurringRule.update({ where: { id }, data: parsed });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleRecurringRule(id: string): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.recurringRule.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Recorrência não encontrada." };
  await prisma.recurringRule.update({
    where: { id },
    data: {
      active: !existing.active,
      // ao reativar, não lança retroativo: considera o mês atual como base
      lastPostedMonth: existing.active ? existing.lastPostedMonth : currentYM(),
    },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteRecurringRule(id: string): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.recurringRule.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Recorrência não encontrada." };
  // transações já lançadas são mantidas (recurringRuleId vira null via SetNull)
  await prisma.recurringRule.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: true };
}
