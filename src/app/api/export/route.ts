import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
  TRANSFER: "Transferência",
  CARD_PAYMENT: "Pagamento de fatura",
};

function csvField(value: string): string {
  if (/[";\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Não autenticado", { status: 401 });

  const yParam = request.nextUrl.searchParams.get("y");
  const year = yParam && /^\d{4}$/.test(yParam) ? parseInt(yParam, 10) : null;

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      ...(year
        ? { date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } }
        : {}),
    },
    include: {
      category: true,
      account: true,
      toAccount: true,
      creditCard: true,
    },
    orderBy: { date: "asc" },
  });

  const header = "Data;Descrição;Tipo;Valor (R$);Categoria;Conta/Cartão;Parcela";
  const lines = transactions.map((tx) => {
    const origin = tx.account?.name ?? tx.creditCard?.name ?? "";
    const where =
      tx.type === "TRANSFER"
        ? `${tx.account?.name ?? ""} → ${tx.toAccount?.name ?? ""}`
        : tx.type === "CARD_PAYMENT"
          ? `${tx.account?.name ?? ""} → ${tx.creditCard?.name ?? ""}`
          : origin;
    const sign = tx.type === "EXPENSE" || tx.type === "CARD_PAYMENT" ? -1 : 1;
    const value = ((sign * tx.amount) / 100).toFixed(2).replace(".", ",");
    return [
      tx.date.toLocaleDateString("pt-BR"),
      csvField(tx.description),
      TYPE_LABELS[tx.type] ?? tx.type,
      value,
      csvField(tx.category?.name ?? ""),
      csvField(where),
      tx.installmentNumber ? `${tx.installmentNumber}/${tx.installmentTotal}` : "",
    ].join(";");
  });

  // BOM para o Excel reconhecer UTF-8
  const csv = "\uFEFF" + [header, ...lines].join("\r\n");
  const filename = year
    ? `nebula-transacoes-${year}.csv`
    : "nebula-transacoes.csv";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
