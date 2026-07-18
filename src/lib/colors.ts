/**
 * Paleta categórica validada (CVD + contraste) para a superfície escura
 * #111827 — ordem fixa, nunca ciclada fora dela.
 */
export const CATEGORY_COLORS = [
  "#0899db", // ciano-azul
  "#008300", // verde
  "#d55181", // magenta
  "#c98500", // âmbar
  "#199e70", // verde-água
  "#d95926", // laranja
  "#9085e9", // violeta
  "#e66767", // vermelho
] as const;

/** Par receita/despesa validado (com legenda + rótulos como reforço). */
export const INCOME_COLOR = "#199e70";
export const EXPENSE_COLOR = "#e66767";

/** Chrome dos gráficos (grid, eixos, texto) sobre o vidro escuro. */
export const CHART_GRID = "rgba(255,255,255,0.06)";
export const CHART_AXIS = "rgba(255,255,255,0.25)";
export const CHART_TEXT = "#8b93a7";

export const ACCOUNT_COLORS = CATEGORY_COLORS;
export const CARD_COLORS = [
  "#7c3aed",
  "#0891b2",
  "#be185d",
  "#b45309",
  "#047857",
  "#4338ca",
] as const;

export function colorForIndex(i: number): string {
  return CATEGORY_COLORS[i % CATEGORY_COLORS.length];
}
