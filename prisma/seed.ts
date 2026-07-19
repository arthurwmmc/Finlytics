/**
 * Dados de demonstração: cria o usuário demo@nebula.app (senha: demo1234)
 * com 6 meses de movimentações para preencher os gráficos.
 *
 * Rodar com: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES } from "../src/lib/default-categories";

const prisma = new PrismaClient();

function day(monthsAgo: number, dayOfMonth: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, dayOfMonth, 12);
}

async function main() {
  const email = "demo@nebula.app";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Usuário demo já existe — nada a fazer.");
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: "Conta Demo",
      email,
      passwordHash: await bcrypt.hash("demo1234", 10),
      categories: { create: DEFAULT_CATEGORIES },
    },
  });

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
  });
  const cat = (name: string) => {
    const found = categories.find((c) => c.name === name);
    if (!found) throw new Error(`categoria ${name} não encontrada`);
    return found.id;
  };

  const account = await prisma.account.create({
    data: {
      name: "Banco Principal",
      type: "CHECKING",
      color: "#0899db",
      initialBalance: 250000, // R$ 2.500,00
      userId: user.id,
    },
  });
  await prisma.account.create({
    data: {
      name: "Poupança",
      type: "SAVINGS",
      color: "#199e70",
      initialBalance: 800000,
      userId: user.id,
    },
  });

  const card = await prisma.creditCard.create({
    data: {
      name: "Cartão Nébula",
      brand: "MASTERCARD",
      color: "#7c3aed",
      limit: 800000,
      closingDay: 5,
      dueDay: 12,
      userId: user.id,
    },
  });

  // orçamentos
  await prisma.category.update({
    where: { id: cat("Mercado") },
    data: { monthlyBudget: 120000 },
  });
  await prisma.category.update({
    where: { id: cat("Alimentação") },
    data: { monthlyBudget: 60000 },
  });
  await prisma.category.update({
    where: { id: cat("Lazer") },
    data: { monthlyBudget: 40000 },
  });

  // 6 meses de histórico
  const tx: {
    description: string;
    amount: number;
    date: Date;
    type: string;
    categoryId: string;
    accountId?: string;
    creditCardId?: string;
  }[] = [];

  for (let m = 5; m >= 0; m--) {
    tx.push(
      { description: "Salário", amount: 720000, date: day(m, 5), type: "INCOME", categoryId: cat("Salário"), accountId: account.id },
      { description: "Aluguel", amount: 185000, date: day(m, 10), type: "EXPENSE", categoryId: cat("Moradia"), accountId: account.id },
      { description: "Mercado do mês", amount: 95000 + m * 4300, date: day(m, 8), type: "EXPENSE", categoryId: cat("Mercado"), accountId: account.id },
      { description: "Combustível", amount: 32000, date: day(m, 12), type: "EXPENSE", categoryId: cat("Transporte"), creditCardId: card.id },
      { description: "Restaurantes", amount: 28000 + m * 2100, date: day(m, 18), type: "EXPENSE", categoryId: cat("Alimentação"), creditCardId: card.id },
      { description: "Streaming", amount: 5990, date: day(m, 15), type: "EXPENSE", categoryId: cat("Assinaturas"), creditCardId: card.id },
      { description: "Academia", amount: 12900, date: day(m, 3), type: "EXPENSE", categoryId: cat("Saúde"), accountId: account.id },
      { description: "Cinema e jogos", amount: 15000 + (m % 3) * 8000, date: day(m, 22), type: "EXPENSE", categoryId: cat("Lazer"), creditCardId: card.id }
    );
    if (m % 2 === 0) {
      tx.push({ description: "Freelance de design", amount: 120000, date: day(m, 20), type: "INCOME", categoryId: cat("Freelance"), accountId: account.id });
    }
  }

  await prisma.transaction.createMany({
    data: tx.map((t) => ({ ...t, userId: user.id })),
  });

  // compra parcelada
  const groupId = "seed-parcelas-notebook";
  await prisma.transaction.createMany({
    data: Array.from({ length: 6 }, (_, i) => ({
      description: `Notebook novo (${i + 1}/6)`,
      amount: 75000,
      date: day(2 - i, 15), // 1ª parcela há 2 meses, seguintes mês a mês
      type: "EXPENSE",
      categoryId: cat("Compras"),
      creditCardId: card.id,
      installmentGroupId: groupId,
      installmentNumber: i + 1,
      installmentTotal: 6,
      userId: user.id,
    })),
  });

  // recorrência ativa
  await prisma.recurringRule.create({
    data: {
      description: "Internet fibra",
      amount: 9990,
      type: "EXPENSE",
      dayOfMonth: 7,
      categoryId: cat("Moradia"),
      accountId: account.id,
      active: true,
      lastPostedMonth: null, // será materializada no primeiro acesso
      userId: user.id,
    },
  });

  // meta com aportes
  const goal = await prisma.goal.create({
    data: {
      name: "Reserva de emergência",
      icon: "🛡️",
      color: "#199e70",
      targetAmount: 3000000,
      userId: user.id,
    },
  });
  await prisma.goalContribution.createMany({
    data: [
      { goalId: goal.id, amount: 400000, date: day(3, 6) },
      { goalId: goal.id, amount: 350000, date: day(2, 6) },
      { goalId: goal.id, amount: 500000, date: day(1, 6) },
    ],
  });

  console.log("✅ Dados demo criados — login: demo@nebula.app / senha: demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
