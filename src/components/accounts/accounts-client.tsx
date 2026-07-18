"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import {
  createAccount,
  deleteAccount,
  updateAccount,
} from "@/lib/actions/accounts";
import type { ActionState } from "@/lib/actions/transactions";
import { useActionState } from "react";
import { formatBRL } from "@/lib/money";
import { ACCOUNT_COLORS } from "@/lib/colors";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard } from "@/components/ui/glass-card";
import { Input, Label, Select } from "@/components/ui/field";

type AccountWithBalance = {
  id: string;
  name: string;
  type: string;
  color: string;
  initialBalance: number;
  balance: number;
};

const TYPE_LABELS: Record<string, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CASH: "Dinheiro",
  INVESTMENT: "Investimentos",
};

function ColorPicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [selected, setSelected] = useState(defaultValue);
  return (
    <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Cor">
      {ACCOUNT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={selected === color}
          aria-label={`Cor ${color}`}
          onClick={() => setSelected(color)}
          className={`size-8 rounded-full transition ${
            selected === color
              ? "ring-2 ring-white ring-offset-2 ring-offset-[#111827]"
              : "opacity-70 hover:opacity-100"
          }`}
          style={{ background: color }}
        />
      ))}
      <input type="hidden" name={name} value={selected} />
    </div>
  );
}

function AccountForm({
  editing,
  onDone,
}: {
  editing: AccountWithBalance | null;
  onDone: () => void;
}) {
  const action = useMemo(
    () => (editing ? updateAccount.bind(null, editing.id) : createAccount),
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

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="acc-name">Nome</Label>
        <Input
          id="acc-name"
          name="name"
          placeholder="Ex: Nubank"
          defaultValue={editing?.name ?? ""}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="acc-type">Tipo</Label>
          <Select
            id="acc-type"
            name="type"
            defaultValue={editing?.type ?? "CHECKING"}
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="acc-balance">Saldo inicial (R$)</Label>
          <Input
            id="acc-balance"
            name="initialBalance"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={
              editing
                ? (editing.initialBalance / 100).toFixed(2).replace(".", ",")
                : ""
            }
          />
        </div>
      </div>
      <div>
        <Label>Cor</Label>
        <ColorPicker name="color" defaultValue={editing?.color ?? ACCOUNT_COLORS[0]} />
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
        {pending ? "Salvando…" : editing ? "Salvar" : "Criar conta"}
      </button>
    </form>
  );
}

export function AccountsClient({
  accounts,
}: {
  accounts: AccountWithBalance[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccountWithBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Saldo total:{" "}
          <span className="tabular font-semibold text-foreground">
            {formatBRL(total)}
          </span>
        </p>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-semibold text-white inline-flex items-center gap-1.5"
        >
          <Plus size={16} /> Nova conta
        </button>
      </div>

      {error && (
        <p className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      {accounts.length === 0 ? (
        <GlassCard>
          <EmptyState icon="👛" title="Nenhuma conta cadastrada" />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="glass glass-hover rounded-2xl p-5 relative overflow-hidden group"
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: account.color }}
                aria-hidden
              />
              <div className="flex items-start justify-between">
                <span
                  className="size-10 rounded-xl flex items-center justify-center text-white"
                  style={{ background: account.color }}
                  aria-hidden
                >
                  <Wallet size={18} />
                </span>
                <span className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                  <button
                    onClick={() => {
                      setEditing(account);
                      setModalOpen(true);
                    }}
                    className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-white/10"
                    aria-label={`Editar ${account.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(`Excluir a conta "${account.name}"?`)) return;
                      setError(null);
                      startTransition(async () => {
                        const result = await deleteAccount(account.id);
                        if (result.error) setError(result.error);
                      });
                    }}
                    className="rounded-lg p-1.5 text-muted hover:text-expense hover:bg-expense/10"
                    aria-label={`Excluir ${account.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">
                {TYPE_LABELS[account.type] ?? account.type}
              </p>
              <p className="text-base font-medium truncate">{account.name}</p>
              <p
                className={`font-[family-name:var(--font-space-grotesk)] text-xl font-bold mt-1 tabular ${
                  account.balance < 0 ? "text-expense" : ""
                }`}
              >
                {formatBRL(account.balance)}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar conta" : "Nova conta"}
      >
        <AccountForm
          key={editing?.id ?? "new"}
          editing={editing}
          onDone={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
}
