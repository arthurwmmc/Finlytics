import { CATEGORY_COLORS } from "./colors";

const c = CATEGORY_COLORS;

/** Categorias criadas automaticamente para cada novo usuário. */
export const DEFAULT_CATEGORIES: {
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
  color: string;
}[] = [
  // Despesas
  { name: "Alimentação", type: "EXPENSE", icon: "🍔", color: c[5] },
  { name: "Mercado", type: "EXPENSE", icon: "🛒", color: c[1] },
  { name: "Moradia", type: "EXPENSE", icon: "🏠", color: c[0] },
  { name: "Transporte", type: "EXPENSE", icon: "🚗", color: c[3] },
  { name: "Saúde", type: "EXPENSE", icon: "💊", color: c[7] },
  { name: "Lazer", type: "EXPENSE", icon: "🎮", color: c[6] },
  { name: "Educação", type: "EXPENSE", icon: "📚", color: c[4] },
  { name: "Assinaturas", type: "EXPENSE", icon: "📺", color: c[2] },
  { name: "Compras", type: "EXPENSE", icon: "🛍️", color: c[2] },
  { name: "Viagem", type: "EXPENSE", icon: "✈️", color: c[0] },
  { name: "Pets", type: "EXPENSE", icon: "🐾", color: c[3] },
  { name: "Outros", type: "EXPENSE", icon: "📦", color: c[5] },
  // Receitas
  { name: "Salário", type: "INCOME", icon: "💼", color: c[4] },
  { name: "Freelance", type: "INCOME", icon: "💻", color: c[0] },
  { name: "Investimentos", type: "INCOME", icon: "📈", color: c[1] },
  { name: "Presentes", type: "INCOME", icon: "🎁", color: c[2] },
  { name: "Outras receitas", type: "INCOME", icon: "💰", color: c[3] },
];
