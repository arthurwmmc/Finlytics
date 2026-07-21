"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createTransaction,
  createTransfer,
  updateTransaction,
  updateTransfer,
  type ActionState,
} from "@/lib/actions/transactions";
import { Input, Label, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
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

  const isTransfer = type === "TRANSFER";

  const action = useMemo(() => {
    if (editing) {
      return editing.type === "TRANSFER"
        ? updateTransfer.bind(null, editing.id)
        : updateTransaction.bind(null, editing.id);
    }
    return isTransfer ? createTransfer : createTransaction;
  }, [editing, isTransfer]);

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
  // ao editar, não deixa converter entre transferência e receita/despesa
  const typeLocked = !!editing;

  return (
    <form action={formAction} className="space-y-4">
      {/* Tipo: pills */}
      <div
        className="grid grid-cols-3 gap-2"
        role="radiogroup"
        aria-label="Tipo"
      >
        {(
          [
            ["EXPENSE", "Despesa", "border-expense/40 bg-expense/15 text-expense"],
            ["INCOME", "Receita", "border-income/40 bg-income/15 text-income"],
            [
              "TRANSFER",
              "Transferência",
              "border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan",
            ],
          ] as const
        ).map(([value, label, activeClass]) => {
          const disabled =
            typeLocked &&
            ((editing!.type === "TRANSFER") !== (value === "TRANSFER"));
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              disabled={disabled}
              onClick={() => setType(value)}
              className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition disabled:opacity-30 ${
                type === value
                  ? activeClass
                  : "border-white/10 bg-white/5 text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {!isTransfer && <input type="hidden" name="type" value={type} />}

      <div>
        <Label htmlFor="tx-description">Descrição</Label>
        <Input
          id="tx-description"
          name="description"
          placeholder={
            isTransfer ? "Ex: Aporte na poupança (opcional)" : "Ex: Mercado da semana"
          }
          defaultValue={editing?.description ?? ""}
          required={!isTransfer}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="tx-amount">Valor</Label>
          <MoneyInput
            id="tx-amount"
            name="amount"
            placeholder="0,00"
            defaultValue={editing ? String(editing.amount) : undefined}
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

      {isTransfer ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="tx-from">De (conta)</Label>
            <Select
              id="tx-from"
              name="fromAccountId"
              defaultValue={editing?.accountId ?? accounts[0]?.id ?? ""}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tx-to">Para (conta)</Label>
            <Select
              id="tx-to"
              name="toAccountId"
              defaultValue={editing?.toAccountId ?? accounts[1]?.id ?? ""}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : (
        <>
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
        </>
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
            : isTransfer
              ? "Transferir"
              : "Adicionar transação"}
      </button>
    </form>
  );
}
