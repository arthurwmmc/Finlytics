"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseBRL } from "@/lib/money";
import type { ActionState } from "./transactions";

function parseGoal(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || "🎯";
  const color = String(formData.get("color") ?? "#0899db");
  const targetAmount = parseBRL(String(formData.get("targetAmount") ?? ""));
  const targetDateStr = String(formData.get("targetDate") ?? "");

  if (!name) return { error: "Informe o nome da meta." } as const;
  if (!Number.isFinite(targetAmount) || targetAmount <= 0)
    return { error: "Valor-alvo inválido." } as const;

  let targetDate: Date | null = null;
  if (targetDateStr) {
    const [y, m, d] = targetDateStr.split("-").map(Number);
    targetDate = new Date(y, m - 1, d, 12);
  }

  return { name, icon, color, targetAmount, targetDate } as const;
}

export async function createGoal(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseGoal(formData);
  if ("error" in parsed) return parsed;
  await prisma.goal.create({ data: { ...parsed, userId: user.id } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateGoal(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Meta não encontrada." };
  const parsed = parseGoal(formData);
  if ("error" in parsed) return parsed;
  await prisma.goal.update({ where: { id }, data: parsed });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteGoal(id: string): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Meta não encontrada." };
  await prisma.goal.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addGoalContribution(
  goalId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId: user.id },
  });
  if (!goal) return { error: "Meta não encontrada." };

  const amount = parseBRL(String(formData.get("amount") ?? ""));
  if (!Number.isFinite(amount) || amount === 0)
    return { error: "Valor inválido." };

  await prisma.goalContribution.create({ data: { goalId, amount } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteGoalContribution(
  id: string
): Promise<ActionState> {
  const user = await requireUser();
  const contribution = await prisma.goalContribution.findFirst({
    where: { id, goal: { userId: user.id } },
  });
  if (!contribution) return { error: "Aporte não encontrado." };
  await prisma.goalContribution.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: true };
}
