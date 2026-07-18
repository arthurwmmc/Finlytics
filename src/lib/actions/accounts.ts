"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseBRL } from "@/lib/money";
import type { ActionState } from "./transactions";

function parseAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "CHECKING");
  const color = String(formData.get("color") ?? "#0899db");
  const balanceRaw = String(formData.get("initialBalance") ?? "").trim();

  if (!name) return { error: "Informe o nome da conta." } as const;
  if (!["CHECKING", "SAVINGS", "CASH", "INVESTMENT"].includes(type))
    return { error: "Tipo inválido." } as const;

  let initialBalance = 0;
  if (balanceRaw) {
    const parsed = parseBRL(balanceRaw);
    if (!Number.isFinite(parsed))
      return { error: "Saldo inicial inválido." } as const;
    initialBalance = parsed;
  }

  return { name, type, color, initialBalance } as const;
}

export async function createAccount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseAccount(formData);
  if ("error" in parsed) return parsed;
  await prisma.account.create({ data: { ...parsed, userId: user.id } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateAccount(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.account.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Conta não encontrada." };
  const parsed = parseAccount(formData);
  if ("error" in parsed) return parsed;
  await prisma.account.update({ where: { id }, data: parsed });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.account.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { transactions: true } } },
  });
  if (!existing) return { error: "Conta não encontrada." };
  if (existing._count.transactions > 0)
    return {
      error: "Esta conta tem transações. Excluir a conta apagará todas — remova-as antes se quiser preservá-las.",
    };
  await prisma.account.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: true };
}
