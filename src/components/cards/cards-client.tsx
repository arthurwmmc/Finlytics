"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { createCard, deleteCard, updateCard } from "@/lib/actions/cards";
import type { ActionState } from "@/lib/actions/transactions";
import { CARD_COLORS } from "@/lib/colors";
import { formatBRL } from "@/lib/money";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Input, Label, Select } from "@/components/ui/field";
import type { CardDTO } from "@/lib/types";

export type InvoiceData = {
  card: CardDTO;
  total: number;
  used: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  transactions: {
    id: string;
    description: string;
    amount: number;
    type: string;
    date: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
  }[];
};

const BRANDS = ["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OUTRO"];

function CardForm({
  editing,
  onDone,
}: {
  editing: CardDTO | null;
  onDone: () => void;
}) {
  const [color, setColor] = useState(editing?.color ?? CARD_COLORS[0]);
  const action = useMemo(
    () => (editing ? updateCard.bind(null, editing.id) : createCard),
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
        <Label htmlFor="card-name">Nome</Label>
        <Input
          id="card-name"
          name="name"
          placeholder="Ex: Nubank Ultravioleta"
          defaultValue={editing?.name ?? ""}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="card-brand">Bandeira</Label>
          <Select
            id="card-brand"
            name="brand"
            defaultValue={editing?.brand ?? "VISA"}
          >
            {BRANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="card-limit">Limite (R$)</Label>
          <Input
            id="card-limit"
            name="limit"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={
              editing ? (editing.limit / 100).toFixed(2).replace(".", ",") : ""
            }
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="card-closing">Dia do fechamento</Label>
          <Input
            id="card-closing"
            name="closingDay"
            type="number"
            min={1}
            max={28}
            defaultValue={editing?.closingDay ?? ""}
            required
          />
        </div>
        <div>
          <Label htmlFor="card-due">Dia do vencimento</Label>
          <Input
            id="card-due"
            name="dueDay"
            type="number"
            min={1}
            max={28}
            defaultValue={editing?.dueDay ?? ""}
            required
          />
        </div>
      </div>
      <div>
        <Label>Cor</Label>
        <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Cor">
          {CARD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={`Cor ${c}`}
              onClick={() => setColor(c)}
              className={`size-8 rounded-full transition ${
                color === c
                  ? "ring-2 ring-white ring-offset-2 ring-offset-[#111827]"
                  : "opacity-70 hover:opacity-100"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
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
        {pending ? "Salvando…" : editing ? "Salvar" : "Adicionar cartão"}
      </button>
    </form>
  );
}

export function CardsClient({ invoices }: { invoices: InvoiceData[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CardDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-semibold text-white inline-flex items-center gap-1.5"
        >
          <Plus size={16} /> Novo cartão
        </button>
      </div>

      {error && (
        <p className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      {invoices.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="💳"
            title="Nenhum cartão cadastrado"
            description="Adicione seus cartões para acompanhar faturas e parcelamentos."
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {invoices.map(({ card, total, used, dueDate, periodStart, periodEnd, transactions }) => {
            const usedPercent = card.limit > 0 ? (used / card.limit) * 100 : 0;
            return (
              <GlassCard key={card.id} className="space-y-4">
                {/* topo estilo cartão físico */}
                <div
                  className="rounded-2xl p-5 text-white relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${card.color}, ${card.color}88)`,
                  }}
                >
                  <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/10 blur-xl" aria-hidden />
                  <div className="flex items-start justify-between relative">
                    <div>
                      <p className="text-sm/tight opacity-85">{card.brand}</p>
                      <p className="text-lg font-semibold">{card.name}</p>
                    </div>
                    <span className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditing(card);
                          setModalOpen(true);
                        }}
                        className="rounded-lg p-1.5 bg-white/15 hover:bg-white/25 transition"
                        aria-label={`Editar ${card.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm(`Excluir o cartão "${card.name}"?`)) return;
                          setError(null);
                          startTransition(async () => {
                            const result = await deleteCard(card.id);
                            if (result.error) setError(result.error);
                          });
                        }}
                        className="rounded-lg p-1.5 bg-white/15 hover:bg-white/25 transition"
                        aria-label={`Excluir ${card.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                  <div className="mt-6 flex items-end justify-between relative">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider opacity-75">
                        Fatura do período
                      </p>
                      <p className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold tabular">
                        {formatBRL(total)}
                      </p>
                    </div>
                    <CreditCard size={26} className="opacity-70" aria-hidden />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-muted mb-1.5">
                    <span>
                      Limite comprometido: {formatBRL(used)} de{" "}
                      {formatBRL(card.limit)}
                    </span>
                    <span className="tabular">{Math.round(usedPercent)}%</span>
                  </div>
                  <ProgressBar percent={usedPercent} color={card.color} />
                </div>

                <p className="text-xs text-muted">
                  Período{" "}
                  {new Date(periodStart).toLocaleDateString("pt-BR")} –{" "}
                  {new Date(
                    new Date(periodEnd).getTime() - 86400000
                  ).toLocaleDateString("pt-BR")}{" "}
                  · vence em {new Date(dueDate).toLocaleDateString("pt-BR")}
                </p>

                {transactions.length === 0 ? (
                  <p className="text-sm text-muted text-center py-4">
                    Nenhum lançamento nesta fatura. ✨
                  </p>
                ) : (
                  <ul className="divide-y divide-white/5 -mx-2">
                    {transactions.map((tx) => (
                      <li key={tx.id} className="flex items-center gap-3 px-2 py-2.5">
                        <span
                          className="size-8 rounded-lg flex items-center justify-center text-sm shrink-0 border border-white/10"
                          style={{ background: `${tx.categoryColor}26` }}
                          aria-hidden
                        >
                          {tx.categoryIcon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{tx.description}</p>
                          <p className="text-[11px] text-muted">
                            {new Date(tx.date).toLocaleDateString("pt-BR")} ·{" "}
                            {tx.categoryName}
                          </p>
                        </div>
                        <span
                          className={`tabular text-sm font-semibold ${
                            tx.type === "INCOME" ? "text-income" : ""
                          }`}
                        >
                          {tx.type === "INCOME" ? "+" : ""}
                          {formatBRL(tx.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar cartão" : "Novo cartão"}
      >
        <CardForm
          key={editing?.id ?? "new"}
          editing={editing}
          onDone={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
}
