"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import type { ActionState } from "./transactions";

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!name) return { error: "Informe seu nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "E-mail inválido." };

  const taken = await prisma.user.findFirst({
    where: { email, id: { not: user.id } },
  });
  if (taken) return { error: "Este e-mail já está em uso por outra conta." };

  await prisma.user.update({
    where: { id: user.id },
    data: { name, email },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6)
    return { error: "A nova senha precisa ter pelo menos 6 caracteres." };
  if (password !== confirm) return { error: "As senhas não conferem." };

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full || !(await verifyPassword(current, full.passwordHash)))
    return { error: "Senha atual incorreta." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password) },
  });
  return { ok: true };
}
