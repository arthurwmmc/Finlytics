const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata centavos como R$ 1.234,56 */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Formata centavos de forma compacta: R$ 1,2 mil / R$ 3,4 mi */
export function formatBRLCompact(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

/**
 * Converte input do usuário em centavos.
 * Aceita "1.234,56", "1234,56", "1234.56", "1234".
 */
export function parseBRL(input: string): number {
  const cleaned = input.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return NaN;
  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > lastDot) {
    // vírgula é o separador decimal: remove pontos de milhar
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    // ponto é o separador decimal: remove vírgulas de milhar
    normalized = cleaned.replace(/,/g, "");
  }
  const value = parseFloat(normalized);
  if (Number.isNaN(value)) return NaN;
  return Math.round(value * 100);
}
