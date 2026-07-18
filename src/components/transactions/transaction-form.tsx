"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createTransaction,
  updateTransaction,
  type ActionState,
} from "@/lib/actions/transactions";
import { Input, Label, Select } from "@/components/ui/field";
import type {
  AccountDTO,
  CardDTO,
  CategoryDTO,
  TransactionDTO,
} from "@/lib/types";

function toInputDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function TransactionForm({
  categories,
  accounts,
  cards,
  editing,
  onDone,
}: {
  categories: CategoryDTO[];
  accounts: AccountDTO[];
  cards: CardDTO[];
  editing?: TransactionDTO | null;
  onDone: () => void;
}) {
  const [type, setType] = useState<string>(editing?.type ?? "EXPENSE");
  const [payment, setPayment] = useState<string>(
    editing?.creditCardId
      ? `card:${editing.creditCardId}`
      : editing?.accountId
        ? `account:${editing.accountId}`
        : accounts[0]
          ? `account:${accounts[0].id}`
          : cards[0]
            ? `card:${cards[0].id}`
            : ""
  );

  const action = useMemo(
    () =>
      editing
        ? updateTransaction.bind(null, editing.id)
        : createTransaction,
    [editing]
  );

  const wrapped = async (
    prev: ActionState,
    formData: FormData
  ): Promise<ActionState> => {
    const result = await action(prev, formData);
    if (result.ok) onDone();
    return result;
  };

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    wrapped,
    {}
  );

  const filteredCategories = categories.filter((c) => c.type === type);
  const isCard = payment.startsWith("card:");

  return (
    <form action={formAction} className="space-y-4">
      {/* Tipo: pills */}
      <div
        className="grid grid-cols-2 gap-2"
        role="radiogroup"
        aria-label="Tipo"
      >
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
        <Label htmlFor="tx-description">Descrição</Label>
        <Input
          id="tx-description"
          name="description"
          placeholder="Ex: Mercado da semana"
          defaultValue={editing?.description ?? ""}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="tx-amount">Valor (R$)</Label>
          <Input
            id="tx-amount"
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
          <Label htmlFor="tx-date">Data</Label>
          <Input
            id="tx-date"
            name="date"
            type="date"
            defaultValue={toInputDate(editing?.date)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="tx-category">Categoria</Label>
        <Select
          id="tx-category"
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
        <Label htmlFor="tx-payment">Conta / Cartão</Label>
        <Select
          id="tx-payment"
          name="payment"
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
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

      {isCard && !editing && type === "EXPENSE" && (
        <div>
          <Label htmlFor="tx-installments">Parcelas</Label>
          <Select id="tx-installments" name="installments" defaultValue="1">
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "À vista (1x)" : `${n}x`}
              </option>
            ))}
          </Select>
        </div>
      )}

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
        {pending
          ? "Salvando…"
          : editing
            ? "Salvar alterações"
            : "Adicionar transação"}
      </button>
    </form>
  );
}
