/** Formas serializáveis passadas de server components para client components. */

export type CategoryDTO = {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  monthlyBudget: number | null;
};

export type AccountDTO = {
  id: string;
  name: string;
  type: string;
  color: string;
  initialBalance: number;
};

export type CardDTO = {
  id: string;
  name: string;
  brand: string;
  color: string;
  limit: number;
  closingDay: number;
  dueDay: number;
};

export type TransactionDTO = {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO
  type: string;
  categoryId: string;
  accountId: string | null;
  creditCardId: string | null;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  recurringRuleId: string | null;
};
