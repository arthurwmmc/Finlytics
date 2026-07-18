"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { CreditCard, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import {
  createRecurringRule,
  deleteRecurringRule,
  toggleRecurringRule,
  updateRecurringRule,
} from "@/lib/actions/recurring";
import type { ActionState } from "@/lib/actions/transactions";
import { formatBRL } from "@/lib/money";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/field";
import type { AccountDTO, CardDTO, CategoryDTO } from "@/lib/types";

type RuleItem = {
  id: string;
  description: string;
  amount: number;
  type: string;
  dayOfMonth: number;
  active: boolean;
  categoryId: string;
  accountId: string | null;
  creditCardId: string | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  paymentName: string;
  isCard: boolean;
};

function RuleForm({
  categories,
  accounts,
  cards,
  editing,
  onDone,
}: {
  categories: CategoryDTO[];
  accounts: AccountDTO[];
  cards: CardDTO[];
  editing: RuleItem | null;
  onDone: () => void;
}) {
  const [type, setType] = useState<string>(editing?.type ?? "EXPENSE");
  const action = useMemo(
    () =>
      editing
        ? updateRecurringRule.bind(null, editing.id)
        : createRecurringRule,
    [editing]
  );
  const wrapped = async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok) onDone();
    return result;
  };
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    wrapped,
    {}
  );

  const filteredCategories = categories.filter((c) => c.type === type);
  const defaultPayment = editing?.creditCardId
    ? `card:${editing.creditCardId}`
    : editing?.accountId
      ? `account:${editing.accountId}`
      : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
        {(
          [
            ["EXPENSE", "Despesa", "border-expense/40 bg-expense/15 text-expense"],
            ["INCOME", "Receita", "border-income/40 bg-income/15 text-income"],
          ] as const
        ).map(([value, label, activeClass]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => setType(value)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              type === value
                ? activeClass
                : "border-white/10 bg-white/5 text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      <div>
        <Label htmlFor="rule-description">Descrição</Label>
        <Input
          id="rule-description"
          name="description"
          placeholder="Ex: Aluguel"
          defaultValue={editing?.description ?? ""}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="rule-amount">Valor (R$)</Label>
          <Input
            id="rule-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={
              editing ? (editing.amount / 100).toFixed(2).replace(".", ",") : ""
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="rule-day">Dia do mês</Label>
          <Input
            id="rule-day"
            name="dayOfMonth"
            type="number"
            min={1}
            max={31}
            defaultValue={editing?.dayOfMonth ?? ""}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="rule-category">Categoria</Label>
        <Select
          id="rule-category"
          name="categoryId"
          defaultValue={editing?.categoryId ?? ""}
          required
        >
          <option value="" disabled>
            Escolha…
          </option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="rule-payment">Conta / Cartão</Label>
        <Select
          id="rule-payment"
          name="payment"
          defaultValue={
            defaultPayment ??
            (accounts[0]
              ? `account:${accounts[0].id}`
              : cards[0]
                ? `card:${cards[0].id}`
                : "")
          }
          required
        >
          {accounts.length > 0 && (
            <optgroup label="Contas">
              {accounts.map((a) => (
                <option key={a.id} value={`account:${a.id}`}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          )}
          {cards.length > 0 && (
            <optgroup label="Cartões de crédito">
              {cards.map((c) => (
                <option key={c.id} value={`card:${c.id}`}>
                  💳 {c.name}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      </div>

      {state.error && (
        <p className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-gradient w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Salvando…" : editing ? "Salvar" : "Criar recorrência"}
      </button>
      {!editing && (
        <p className="text-[11px] text-muted text-center">
          A primeira ocorrência será lançada já neste mês.
        </p>
      )}
    </form>
  );
}

export function RecurringClient({
  rules,
  categories,
  accounts,
  cards,
}: {
  rules: RuleItem[];
  categories: CategoryDTO[];
  accounts: AccountDTO[];
  cards: CardDTO[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RuleItem | null>(null);
  const [, startTransition] = useTransition();

  const monthlyExpense = rules
    .filter((r) => r.active && r.type === "EXPENSE")
    .reduce((sum, r) => sum + r.amount, 0);
  const monthlyIncome = rules
    .filter((r) => r.active && r.type === "INCOME")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="glass rounded-full px-4 py-1.5 text-income tabular">
            +{formatBRL(monthlyIncome)}/mês
          </span>
          <span className="glass rounded-full px-4 py-1.5 text-expense tabular">
            −{formatBRL(monthlyExpense)}/mês
          </span>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-semibold text-white inline-flex items-center gap-1.5"
        >
          <Plus size={16} /> Nova recorrência
        </button>
      </div>

      <GlassCard className="!p-0 overflow-hidden">
        {rules.length === 0 ? (
          <EmptyState
            icon="🔁"
            title="Nenhuma recorrência cadastrada"
            description="Aluguel, assinaturas, salário — cadastre e esqueça."
          />
        ) : (
          <ul className="divide-y divide-white/5">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 group ${
                  rule.active ? "" : "opacity-50"
                }`}
              >
                <span
                  className="size-9 rounded-xl flex items-center justify-center text-base shrink-0 border border-white/10"
                  style={{ background: `${rule.categoryColor}26` }}
                  aria-hidden
                >
                  {rule.categoryIcon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{rule.description}</p>
                  <p className="text-[11px] text-muted flex items-center gap-1.5 flex-wrap">
                    todo dia {rule.dayOfMonth} · {rule.categoryName} ·
                    <span className="inline-flex items-center gap-1">
                      {rule.isCard ? (
                        <CreditCard size={11} aria-label="cartão" />
                      ) : (
                        <Wallet size={11} aria-label="conta" />
                      )}
                      {rule.paymentName}
                    </span>
                  </p>
                </div>
                <span
                  className={`tabular text-sm font-semibold shrink-0 ${
                    rule.type === "INCOME" ? "text-income" : "text-expense"
                  }`}
                >
                  {rule.type === "INCOME" ? "+" : "−"}
                  {formatBRL(rule.amount)}
                </span>

                {/* toggle ativa/pausa */}
                <button
                  role="switch"
                  aria-checked={rule.active}
                  aria-label={`${rule.active ? "Pausar" : "Ativar"} ${rule.description}`}
                  onClick={() =>
                    startTransition(() => {
                      toggleRecurringRule(rule.id);
                    })
                  }
                  className={`relative w-9 h-5 rounded-full transition shrink-0 ${
                    rule.active ? "bg-accent-cyan/70" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                      rule.active ? "left-4.5" : "left-0.5"
                    }`}
                  />
                </button>

                <span className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                  <button
                    onClick={() => {
                      setEditing(rule);
                      setModalOpen(true);
                    }}
                    className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-white/10"
                    aria-label={`Editar ${rule.description}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        !confirm(
                          `Excluir a recorrência "${rule.description}"? As transações já lançadas serão mantidas.`
                        )
                      )
                        return;
                      startTransition(() => {
                        deleteRecurringRule(rule.id);
                      });
                    }}
                    className="rounded-lg p-1.5 text-muted hover:text-expense hover:bg-expense/10"
                    aria-label={`Excluir ${rule.description}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar recorrência" : "Nova recorrência"}
      >
        <RuleForm
          key={editing?.id ?? "new"}
          categories={categories}
          accounts={accounts}
          cards={cards}
          editing={editing}
          onDone={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
}
