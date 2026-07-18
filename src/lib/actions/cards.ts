"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseBRL } from "@/lib/money";
import type { ActionState } from "./transactions";

function parseCard(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "OUTRO");
  const color = String(formData.get("color") ?? "#7c3aed");
  const limitCents = parseBRL(String(formData.get("limit") ?? ""));
  const closingDay = parseInt(String(formData.get("closingDay") ?? ""), 10);
  const dueDay = parseInt(String(formData.get("dueDay") ?? ""), 10);

  if (!name) return { error: "Informe o nome do cartão." } as const;
  if (!Number.isFinite(limitCents) || limitCents <= 0)
    return { error: "Limite inválido." } as const;
  if (!closingDay || closingDay < 1 || closingDay > 28)
    return { error: "Dia de fechamento deve estar entre 1 e 28." } as const;
  if (!dueDay || dueDay < 1 || dueDay > 28)
    return { error: "Dia de vencimento deve estar entre 1 e 28." } as const;

  return { name, brand, color, limit: limitCents, closingDay, dueDay } as const;
}

export async function createCard(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseCard(formData);
  if ("error" in parsed) return parsed;
  await prisma.creditCard.create({ data: { ...parsed, userId: user.id } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCard(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.creditCard.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Cartão não encontrado." };
  const parsed = parseCard(formData);
  if ("error" in parsed) return parsed;
  await prisma.creditCard.update({ where: { id }, data: parsed });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCard(id: string): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.creditCard.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { transactions: true } } },
  });
  if (!existing) return { error: "Cartão não encontrado." };
  if (existing._count.transactions > 0)
    return {
      error: "Este cartão tem transações. Remova-as antes de excluí-lo.",
    };
  await prisma.creditCard.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: true };
}
