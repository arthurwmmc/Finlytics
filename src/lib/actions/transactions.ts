"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseBRL } from "@/lib/money";

export type ActionState = { error?: string; ok?: boolean };

function parseCommon(formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const amount = parseBRL(String(formData.get("amount") ?? ""));
  const dateStr = String(formData.get("date") ?? "");
  const type = String(formData.get("type") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const payment = String(formData.get("payment") ?? ""); // "account:<id>" | "card:<id>"

  if (!description) return { error: "Informe uma descrição." } as const;
  if (!Number.isFinite(amount) || amount <= 0)
    return { error: "Valor inválido." } as const;
  if (!dateStr) return { error: "Informe a data." } as const;
  if (type !== "INCOME" && type !== "EXPENSE")
    return { error: "Tipo inválido." } as const;
  if (!categoryId) return { error: "Escolha uma categoria." } as const;

  const [kind, refId] = payment.split(":");
  if ((kind !== "account" && kind !== "card") || !refId)
    return { error: "Escolha a conta ou cartão." } as const;

  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);

  return {
    description,
    amount,
    date,
    type: type as "INCOME" | "EXPENSE",
    categoryId,
    accountId: kind === "account" ? refId : null,
    creditCardId: kind === "card" ? refId : null,
  } as const;
}

async function assertOwnership(
  userId: string,
  categoryId: string,
  accountId: string | null,
  creditCardId: string | null
): Promise<string | null> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) return "Categoria inválida.";
  if (accountId) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) return "Conta inválida.";
  }
  if (creditCardId) {
    const card = await prisma.creditCard.findFirst({
      where: { id: creditCardId, userId },
    });
    if (!card) return "Cartão inválido.";
  }
  return null;
}

export async function createTransaction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseCommon(formData);
  if ("error" in parsed) return parsed;

  const ownershipError = await assertOwnership(
    user.id,
    parsed.categoryId,
    parsed.accountId,
    parsed.creditCardId
  );
  if (ownershipError) return { error: ownershipError };

  const installments = Math.max(
    1,
    parseInt(String(formData.get("installments") ?? "1"), 10) || 1
  );

  if (installments > 1 && parsed.creditCardId) {
    // parcelamento: divide em N transações mensais; a 1ª absorve o resto da divisão
    const groupId = randomUUID();
    const base = Math.floor(parsed.amount / installments);
    const remainder = parsed.amount - base * installments;
    await prisma.transaction.createMany({
      data: Array.from({ length: installments }, (_, i) => {
        const date = new Date(parsed.date);
        date.setMonth(date.getMonth() + i);
        return {
          description: `${parsed.description} (${i + 1}/${installments})`,
          amount: i === 0 ? base + remainder : base,
          date,
          type: parsed.type,
          categoryId: parsed.categoryId,
          creditCardId: parsed.creditCardId,
          installmentGroupId: groupId,
          installmentNumber: i + 1,
          installmentTotal: installments,
          userId: user.id,
        };
      }),
    });
  } else {
    await prisma.transaction.create({
      data: {
        description: parsed.description,
        amount: parsed.amount,
        date: parsed.date,
        type: parsed.type,
        categoryId: parsed.categoryId,
        accountId: parsed.accountId,
        creditCardId: parsed.creditCardId,
        userId: user.id,
      },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateTransaction(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Transação não encontrada." };

  const parsed = parseCommon(formData);
  if ("error" in parsed) return parsed;

  const ownershipError = await assertOwnership(
    user.id,
    parsed.categoryId,
    parsed.accountId,
    parsed.creditCardId
  );
  if (ownershipError) return { error: ownershipError };

  await prisma.transaction.update({
    where: { id },
    data: {
      description: parsed.description,
      amount: parsed.amount,
      date: parsed.date,
      type: parsed.type,
      categoryId: parsed.categoryId,
      accountId: parsed.accountId,
      creditCardId: parsed.creditCardId,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Transação não encontrada." };
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Exclui todas as parcelas de uma compra parcelada. */
export async function deleteInstallmentGroup(
  groupId: string
): Promise<ActionState> {
  const user = await requireUser();
  await prisma.transaction.deleteMany({
    where: { installmentGroupId: groupId, userId: user.id },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
