"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseBRL } from "@/lib/money";
import type { ActionState } from "./transactions";

function parseCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const icon = String(formData.get("icon") ?? "").trim() || "🏷️";
  const color = String(formData.get("color") ?? "#0899db");
  const budgetRaw = String(formData.get("monthlyBudget") ?? "").trim();

  if (!name) return { error: "Informe o nome da categoria." } as const;
  if (type !== "INCOME" && type !== "EXPENSE")
    return { error: "Tipo inválido." } as const;

  let monthlyBudget: number | null = null;
  if (budgetRaw) {
    const parsed = parseBRL(budgetRaw);
    if (!Number.isFinite(parsed) || parsed < 0)
      return { error: "Orçamento inválido." } as const;
    monthlyBudget = parsed > 0 ? parsed : null;
  }

  return { name, type, icon, color, monthlyBudget } as const;
}

export async function createCategory(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseCategory(formData);
  if ("error" in parsed) return parsed;

  await prisma.category.create({ data: { ...parsed, userId: user.id } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCategory(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.category.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Categoria não encontrada." };

  const parsed = parseCategory(formData);
  if ("error" in parsed) return parsed;

  await prisma.category.update({ where: { id }, data: parsed });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.category.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { transactions: true } } },
  });
  if (!existing) return { error: "Categoria não encontrada." };
  if (existing._count.transactions > 0)
    return {
      error:
        "Esta categoria tem transações. Mova ou exclua as transações antes.",
    };
  await prisma.category.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Define/remove o orçamento mensal de uma categoria (usado na página Orçamento). */
export async function setCategoryBudget(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.category.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Categoria não encontrada." };

  const raw = String(formData.get("monthlyBudget") ?? "").trim();
  let monthlyBudget: number | null = null;
  if (raw) {
    const parsed = parseBRL(raw);
    if (!Number.isFinite(parsed) || parsed < 0)
      return { error: "Valor inválido." };
    monthlyBudget = parsed > 0 ? parsed : null;
  }

  await prisma.category.update({ where: { id }, data: { monthlyBudget } });
  revalidatePath("/", "layout");
  return { ok: true };
}
